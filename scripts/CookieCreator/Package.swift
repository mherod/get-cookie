// swift-tools-version: 5.9

import PackageDescription

let package = Package(
    name: "CookieCreator",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(
            name: "CookieCreator",
            path: "Sources"
        )
    ]
)
