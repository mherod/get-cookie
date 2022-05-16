# get-cookie

## What is it?

get-cookie is a command line utility that allows you to get the value of a cookie from your locally installed browser.
It is useful for testing web pages that require authentication.

## Installation

To install get-cookie, run the following command:

        $ npm install @mherod/get-cookie --global

## How do I use it?

To use get-cookie, run the following command:

        $ get-cookie <cookie-name> <domain>

For example, to get the value of the `auth` cookie on the `www.example.com` domain, run the following command:

        $ get-cookie auth www.example.com

The output of the command will be the value of the cookie.

The library can also be used as a module.

```javascript
const {getCookie} = require('@mherod/get-cookie');
getCookie('auth', 'www.example.com').then(console.log);
```
