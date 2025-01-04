#!/bin/bash

# Compile the Swift script
cd "$(dirname "$0")/CookieCreator"
swiftc Sources/main.swift -o cookie-creator

# Check if compilation was successful
if [ $? -eq 0 ]; then
    # Run the compiled binary
    ./cookie-creator

    # Move the generated file to the parent directory
    mv Cookies.binarycookies ../
else
    echo "Compilation failed"
    exit 1
fi
