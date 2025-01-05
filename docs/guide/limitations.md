# Known Limitations 🚧

This guide details the current limitations and known issues when using get-cookie.

## Platform Support Limitations

- Full functionality only available on macOS
- Firefox has experimental Linux support
- Windows support not implemented

## Browser-Specific Limitations

### Chrome

- Requires macOS Keychain access
- Safe Storage password must be accessible
- Profile directories must be readable

### Firefox

- Database must be readable by current user
- Profile discovery may be limited
- No encryption handling needed

### Safari

- Requires access to container directory
- Binary cookie format parsing
- System-wide storage access needed

## Cookie Handling Limitations

- Some cookies may be inaccessible due to permissions
- Expired cookies are filtered by default
- Domain matching includes subdomains
- Some browser profiles may be locked/in use

## Error Handling Considerations

- Fails gracefully if browser data is inaccessible
- Reports decryption failures for Chrome cookies
- Skips problematic cookies while processing
- Profile access errors are handled gracefully

## Security Constraints

- Keychain access required for Chrome
- Container permissions needed for Safari
- Profile directory access permissions
- System Integrity Protection affects access

## Performance Considerations

- Large cookie stores may impact performance
- Multiple profile scanning takes time
- Decryption operations can be slow
- Database locks may cause delays
