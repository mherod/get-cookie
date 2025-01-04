import Darwin

// Cookie flags
let FLAG_SECURE: UInt32 = 0x1
let FLAG_HTTP_ONLY: UInt32 = 0x4

// File structure constants
let MAGIC = [UInt8]("cook".utf8)
let FOOTER: UInt64 = 0x071720050000004b

struct Cookie {
    let url: String
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
        bytes = Array(ptr)
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
    return Double(tv.tv_sec) + Double(tv.tv_usec) / 1_000_000
}

func createCookiePage(cookies: [Cookie], fd: Int32) {
    // Page header (0x00000100)
    writeInteger(UInt32(0x00000100), littleEndian: false, to: fd)

    // Number of cookies
    writeInteger(UInt32(cookies.count), to: fd)

    // Calculate offsets
    let headerSize = 8 + (4 * cookies.count) + 4 // header + offsets + footer
    var currentOffset = UInt32(headerSize)
    var cookieOffsets: [UInt32] = []

    // Reserve space for offsets
    for _ in 0..<cookies.count {
        cookieOffsets.append(currentOffset)
        writeInteger(UInt32(0), to: fd) // Placeholder
    }

    // Page footer (0x00000000)
    writeInteger(UInt32(0), littleEndian: false, to: fd)

    // Now add each cookie
    for (index, cookie) in cookies.enumerated() {
        let cookieStart = lseek(fd, 0, SEEK_CUR)
        cookieOffsets[index] = UInt32(cookieStart)

        // Cookie size placeholder
        let sizePosition = lseek(fd, 0, SEEK_CUR)
        writeInteger(UInt32(0), to: fd)

        // Unknown (4 bytes)
        writeInteger(UInt32(0), to: fd)

        // Flags
        writeInteger(cookie.flags, to: fd)

        // Has port (no)
        writeInteger(UInt32(0), to: fd)

        // String offsets
        let stringHeaderStart = lseek(fd, 0, SEEK_CUR)
        let stringHeaderSize = 24 // 6 offsets * 4 bytes
        var currentStringOffset = UInt32(48) // Size of cookie header

        // Write string offsets
        writeInteger(currentStringOffset, to: fd) // URL
        currentStringOffset += UInt32(cookie.url.utf8.count + 1)
        writeInteger(currentStringOffset, to: fd) // Name
        currentStringOffset += UInt32(cookie.name.utf8.count + 1)
        writeInteger(currentStringOffset, to: fd) // Path
        currentStringOffset += UInt32(cookie.path.utf8.count + 1)
        writeInteger(currentStringOffset, to: fd) // Value
        currentStringOffset += UInt32(cookie.value.utf8.count + 1)
        writeInteger(UInt32(0), to: fd) // Comment
        writeInteger(UInt32(0), to: fd) // CommentURL

        // Write timestamps
        writeInteger(cookie.expiry.bitPattern, to: fd)
        writeInteger(cookie.creation.bitPattern, to: fd)

        // Write strings
        writeString(cookie.url, to: fd)
        writeString(cookie.name, to: fd)
        writeString(cookie.path, to: fd)
        writeString(cookie.value, to: fd)

        // Update cookie size
        let currentPosition = lseek(fd, 0, SEEK_CUR)
        let cookieSize = currentPosition - cookieStart
        lseek(fd, sizePosition, SEEK_SET)
        writeInteger(UInt32(cookieSize), to: fd)
        lseek(fd, currentPosition, SEEK_SET)
    }

    // Update cookie offsets
    let endPosition = lseek(fd, 0, SEEK_CUR)
    lseek(fd, 8, SEEK_SET)
    for offset in cookieOffsets {
        writeInteger(offset, to: fd)
    }
    lseek(fd, endPosition, SEEK_SET)
}

// Create example cookies
let now = getCurrentTime()
let cookies = [
    Cookie(
        url: "example.com",
        name: "session",
        value: "abc123",
        path: "/",
        flags: FLAG_SECURE | FLAG_HTTP_ONLY,
        expiry: now + 3600,
        creation: now
    )
]

// Create and open file
let outputPath = "Cookies.binarycookies"
let fd = open(outputPath, O_WRONLY | O_CREAT | O_TRUNC, 0o644)
if fd == -1 {
    print("Failed to create file")
    exit(1)
}

// Write magic bytes
writeToFile(fd, MAGIC)

// Write number of pages (1)
writeInteger(UInt32(1), littleEndian: false, to: fd)

// Create page
createCookiePage(cookies: cookies, fd: fd)

// Write checksum (just use 0 for now)
writeInteger(UInt32(0), to: fd)

// Write footer
writeInteger(FOOTER, littleEndian: false, to: fd)

close(fd)
print("Created \(outputPath)")
