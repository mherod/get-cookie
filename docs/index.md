---
layout: home
pageClass: cookie-home
hero:
  name: get-cookie
  text: Local browser cookies, when you need them
  tagline: Read cookies from supported browser profiles with a CLI or a typed library.
  actions:
    - theme: brand
      text: Get started
      link: /guide/getting-started
    - theme: alt
      text: CLI reference
      link: /guide/cli-usage
    - theme: alt
      text: Library usage
      link: /guide/api-usage

features:
  - title: CLI and library
    details: Query a cookie in a shell, or use the same local data from TypeScript.
    link: /guide/getting-started
    linkText: Start here
  - title: Browser-aware
    details: Supports Chromium-family browsers, Firefox, and Safari with platform-specific storage handling.
    link: /guide/browser-support
    linkText: See support
  - title: Runtime-aware
    details: Use the auto-detecting root import or explicit Node.js and Bun entrypoints.
    link: /guide/api-usage
    linkText: Read API
  - title: Local by design
    details: Extraction happens on the machine that owns the browser profile; treat every returned value as a credential.
    link: /guide/security
    linkText: Security model
---
