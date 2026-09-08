import { defineConfig } from "vitepress";

export default defineConfig({
  title: "get-cookie",
  description: "Read local browser cookies from the CLI or TypeScript",
  base: "/get-cookie/",
  lastUpdated: true,
  sitemap: {
    hostname: "https://mherod.github.io/get-cookie/",
  },
  themeConfig: {
    search: {
      provider: "local",
    },
    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "CLI", link: "/guide/cli-usage" },
      { text: "Library", link: "/guide/api-usage" },
      { text: "Reference", link: "/reference/" },
      { text: "GitHub", link: "https://github.com/mherod/get-cookie" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Start",
          items: [
            { text: "Overview", link: "/guide/" },
            { text: "Getting started", link: "/guide/getting-started" },
          ],
        },
        {
          text: "Use get-cookie",
          items: [
            { text: "CLI reference", link: "/guide/cli-usage" },
            { text: "Library usage", link: "/guide/api-usage" },
            { text: "Examples", link: "/guide/examples" },
            { text: "Automation", link: "/automation/" },
          ],
        },
        {
          text: "Support",
          items: [
            { text: "Browser support", link: "/guide/browser-support" },
            { text: "Security and privacy", link: "/guide/security" },
            { text: "Troubleshooting", link: "/guide/troubleshooting" },
            { text: "Limitations", link: "/guide/limitations" },
          ],
        },
        {
          text: "Project",
          items: [
            { text: "Architecture", link: "/guide/architecture" },
            { text: "Testing", link: "/guide/testing" },
            { text: "Licence and attribution", link: "/guide/license" },
          ],
        },
      ],
      "/automation/": [
        {
          text: "Automation",
          items: [
            { text: "Overview", link: "/automation/" },
            { text: "Shell recipes", link: "/automation/shell-scripts" },
            {
              text: "Browser automation",
              link: "/automation/browser-automation",
            },
          ],
        },
      ],
      "/reference/": [
        {
          text: "API reference",
          items: [
            { text: "Overview", link: "/reference/" },
            { text: "Generated reference", link: "/reference/generated/" },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/mherod/get-cookie" },
      { icon: "npm", link: "https://www.npmjs.com/package/@mherod/get-cookie" },
    ],
    footer: {
      message: "Local browser-cookie extraction for controlled environments",
      copyright:
        'ISC licensed · <a href="/get-cookie/guide/license.html">Licence and attribution</a>',
    },
    outline: {
      level: [2, 3],
      label: "On this page",
    },
    lastUpdated: {
      text: "Updated",
      formatOptions: {
        dateStyle: "medium",
      },
    },
  },
});
