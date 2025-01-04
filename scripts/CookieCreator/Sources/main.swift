import Darwin

// Cookie flags
let FLAG_SECURE: UInt32 = 0x1
let FLAG_HTTP_ONLY: UInt32 = 0x4

// File structure constants
let MAGIC = [UInt8]("cook".utf8)
let FOOTER: UInt64 = 0x071720050000004b

struct Cookie {
    let domain: String
    let name: String
    let value: String
    let path: String
    let flags: UInt32
    let expiry: Double  // Seconds since 2001-01-01
    let creation: Double // Seconds since 2001-01-01
}

func writeToFile(_ fd: Int32, _ bytes: [UInt8]) {
    _ = bytes.withUnsafeBufferPointer { ptr in
        Darwin.write(fd, ptr.baseAddress, ptr.count)
    }
}

func writeInteger<T: FixedWidthInteger>(_ value: T, littleEndian: Bool = true, to fd: Int32) {
    var bytes = [UInt8](repeating: 0, count: MemoryLayout<T>.size)
    let actualValue = littleEndian ? value.littleEndian : value.bigEndian
    withUnsafeBytes(of: actualValue) { ptr in
        for i in 0..<ptr.count {
            bytes[i] = ptr[i]
        }
    }
    writeToFile(fd, bytes)
}

func writeString(_ str: String, to fd: Int32) {
    let nullTerminated = str + "\0"
    writeToFile(fd, Array(nullTerminated.utf8))
}

func getCurrentTime() -> Double {
    var tv = timeval()
    gettimeofday(&tv, nil)
    let unixTimestamp = Double(tv.tv_sec) + Double(tv.tv_usec) / 1_000_000
    // Convert from Unix timestamp (seconds since 1970) to seconds since 2001-01-01
    return floor(unixTimestamp - 978307200) // Seconds between 1970-01-01 and 2001-01-01
}

func createCookiePage(cookies: [Cookie], fd: Int32) -> Int64 {
    print("Creating cookie page with \(cookies.count) cookies")
    let pageStart = lseek(fd, 0, SEEK_CUR)
    print("Page start position: \(pageStart)")

    // Page header (0x00000100) in big-endian
    writeInteger(UInt32(0x00000100), littleEndian: false, to: fd)  // BE
    print("Wrote page header")

    // Number of cookies
    writeInteger(UInt32(cookies.count), littleEndian: true, to: fd)  // LE
    print("Wrote number of cookies: \(cookies.count)")

    // Calculate offsets
    let headerSize = 8 + (4 * cookies.count) + 4 // header + offsets + footer
    let cookieDataStart = pageStart + Int64(headerSize)
    var cookieOffsets: [UInt32] = []

    // Reserve space for offsets
    for _ in 0..<cookies.count {
        cookieOffsets.append(0)
        writeInteger(UInt32(0), littleEndian: true, to: fd) // LE
    }
    print("Reserved space for cookie offsets")

    // Page footer (0x00000000) in big-endian
    writeInteger(UInt32(0), littleEndian: false, to: fd)  // BE
    print("Wrote page footer")

    // Now add each cookie
    for (index, cookie) in cookies.enumerated() {
        // Calculate string lengths with null terminators
        let urlLength = UInt32(cookie.domain.utf8.count + 1)
        let nameLength = UInt32(cookie.name.utf8.count + 1)
        let pathLength = UInt32(cookie.path.utf8.count + 1)
        let valueLength = UInt32(cookie.value.utf8.count + 1)
        print("Cookie \(index) string lengths: url=\(urlLength), name=\(nameLength), path=\(pathLength), value=\(valueLength)")

        // Calculate string offsets relative to cookie start
        let fixedHeaderSize = UInt32(48) // 4 bytes each for size, version, flags, has_port + 6 offsets (4 bytes each) + 2 timestamps (8 bytes each)
        var currentOffset = fixedHeaderSize

        // Ensure proper alignment for strings
        func alignTo4(_ offset: UInt32) -> UInt32 {
            return (offset + 3) & ~3
        }

        // Calculate string offsets and total size
        let urlOffset = currentOffset
        currentOffset = alignTo4(currentOffset + urlLength)
        let nameOffset = currentOffset
        currentOffset = alignTo4(currentOffset + nameLength)
        let pathOffset = currentOffset
        currentOffset = alignTo4(currentOffset + pathLength)
        let valueOffset = currentOffset
        currentOffset = alignTo4(currentOffset + valueLength)

        // Total cookie size is the current offset (includes header + aligned strings)
        let cookieSize = currentOffset

        // Start writing the cookie
        let cookieStartOffset = lseek(fd, 0, SEEK_CUR)
        print("Cookie \(index) start position: \(cookieStartOffset)")
        cookieOffsets[index] = UInt32(cookieStartOffset - pageStart) // Calculate offset from page start instead of cookie data start

        // Zero out the entire cookie
        writeToFile(fd, [UInt8](repeating: 0, count: Int(cookieSize)))

        // Move back to start of cookie
        lseek(fd, cookieStartOffset, SEEK_SET)

        // Write cookie header
        writeInteger(cookieSize, littleEndian: true, to: fd)  // LE - Total cookie size
        writeInteger(UInt32(0), littleEndian: true, to: fd)  // LE (Version)
        writeInteger(cookie.flags, littleEndian: true, to: fd)  // LE
        writeInteger(UInt32(0), littleEndian: true, to: fd)  // LE (Has port)

        // Write string offsets
        writeInteger(urlOffset, littleEndian: true, to: fd)  // LE
        writeInteger(nameOffset, littleEndian: true, to: fd)  // LE
        writeInteger(pathOffset, littleEndian: true, to: fd)  // LE
        writeInteger(valueOffset, littleEndian: true, to: fd)  // LE
        writeInteger(UInt32(0), littleEndian: true, to: fd)  // LE (Comment)
        writeInteger(UInt32(0), littleEndian: true, to: fd)  // LE (CommentURL)

        // Write timestamps
        writeInteger(cookie.expiry.bitPattern, littleEndian: true, to: fd)  // LE
        writeInteger(cookie.creation.bitPattern, littleEndian: true, to: fd)  // LE

        // Write strings at their offsets
        lseek(fd, cookieStartOffset + Int64(urlOffset), SEEK_SET)
        writeString(cookie.domain, to: fd)

        lseek(fd, cookieStartOffset + Int64(nameOffset), SEEK_SET)
        writeString(cookie.name, to: fd)

        lseek(fd, cookieStartOffset + Int64(pathOffset), SEEK_SET)
        writeString(cookie.path, to: fd)

        lseek(fd, cookieStartOffset + Int64(valueOffset), SEEK_SET)
        writeString(cookie.value, to: fd)

        // Move to the end of the cookie
        lseek(fd, cookieStartOffset + Int64(cookieSize), SEEK_SET)

        print("Cookie \(index) written with size: \(cookieSize)")
    }

    // Update cookie offsets
    let endPosition = lseek(fd, 0, SEEK_CUR)
    lseek(fd, pageStart + 8, SEEK_SET)
    for offset in cookieOffsets {
        writeInteger(offset, littleEndian: true, to: fd)  // LE
    }
    lseek(fd, endPosition, SEEK_SET)
    print("Updated cookie offsets")

    return endPosition - pageStart
}

// Create example cookies
let now = getCurrentTime()

// Page 1: Basic session cookies
let sessionCookies = [
    Cookie(
        domain: "example.com",
        name: "session",
        value: "abc123",
        path: "/",
        flags: FLAG_SECURE | FLAG_HTTP_ONLY,
        expiry: floor(now + 3600),
        creation: floor(now)
    )
]

// Page 2: Authentication cookies
let authCookies = [
    Cookie(
        domain: "api.example.com",
        name: "auth_token",
        value: "xyz789",
        path: "/api",
        flags: FLAG_SECURE | FLAG_HTTP_ONLY,
        expiry: floor(now + 7200),
        creation: floor(now)
    )
]

// Page 3: Preferences cookies
let prefCookies = [
    Cookie(
        domain: "shop.example.com",
        name: "currency",
        value: "GBP",
        path: "/",
        flags: 0,
        expiry: floor(now + 2592000),
        creation: floor(now)
    )
]

let allPages = [sessionCookies, authCookies, prefCookies]

// Create and open file
let outputPath = "Cookies.binarycookies"
let fd = open(outputPath, O_WRONLY | O_CREAT | O_TRUNC, 0o644)
if fd == -1 {
    print("Failed to create file")
    exit(1)
}

// Write magic bytes
writeToFile(fd, MAGIC)

// Write number of pages
writeInteger(UInt32(allPages.count), littleEndian: false, to: fd)  // BE

// Calculate header size (magic + page count + page sizes)
let headerSize = 4 + 4 + (4 * allPages.count)

// Write page sizes array (placeholders)
let pageSizePositions = (0..<allPages.count).map { _ in
    let pos = lseek(fd, 0, SEEK_CUR)
    writeInteger(UInt32(0), littleEndian: false, to: fd)  // BE placeholder
    return pos
}

// Move to first page position
lseek(fd, Int64(headerSize), SEEK_SET)

// Create pages and get their sizes
var pageSizes: [Int64] = []
var pageStarts: [Int64] = []

for cookies in allPages {
    let pageStart = lseek(fd, 0, SEEK_CUR)
    pageStarts.append(pageStart)
    let pageSize = createCookiePage(cookies: cookies, fd: fd)
    pageSizes.append(pageSize)
}

// Update page sizes
for (i, position) in pageSizePositions.enumerated() {
    lseek(fd, position, SEEK_SET)
    writeInteger(UInt32(pageSizes[i]), littleEndian: false, to: fd)  // BE
}

// Move to end of last page
lseek(fd, pageStarts.last! + pageSizes.last!, SEEK_SET)

// Write checksum (just use 0 for now)
writeInteger(UInt32(0), littleEndian: false, to: fd)  // BE

// Write footer
writeInteger(FOOTER, littleEndian: false, to: fd)  // BE

// Write binary plist
let plist = """
bplist00Ñ\u{01}\u{02}_\u{10}\u{18}NSHTTPCookieAcceptPolicy\u{10}\u{02}\u{08}\u{0b}&\u{00}\u{00}\u{00}\u{00}\u{00}\u{00}\u{01}\u{01}\u{00}\u{00}\u{00}\u{00}\u{00}\u{00}\u{00}\u{03}\u{00}\u{00}\u{00}\u{00}\u{00}\u{00}\u{00}\u{00}\u{00}\u{00}\u{00}\u{00}\u{00}\u{00}\u{00}\u{00}(
"""
writeToFile(fd, Array(plist.utf8))

close(fd)
print("Created \(outputPath) with \(allPages.count) pages")
