import { defineConfig } from "vitepress";

export default defineConfig({
  title: "get-cookie 🍪",
  description: "Securely retrieve browser cookies from your local browsers",
  base: "/get-cookie/",
  ignoreDeadLinks: [
    // Ignore dead links to reference pages as they're generated by TypeDoc
    /^\/reference\/.*/,
    // Ignore relative README links
    /\.\.\/README/,
    /\.\/README/,
  ],
  themeConfig: {
    logo: "🍪",
    search: {
      provider: "local",
    },
    nav: [
      { text: "🏠 Home", link: "/" },
      { text: "📚 Guide", link: "/guide/" },
      { text: "🔧 Automation", link: "/automation/" },
      { text: "🔧 API Reference", link: "/reference/" },
      { text: "🛡️ Security", link: "/guide/security" },
      {
        text: "💡 More",
        items: [
          {
            text: "🐛 Report Bug",
            link: "https://github.com/mherod/get-cookie/issues",
          },
          {
            text: "⭐ Star Project",
            link: "https://github.com/mherod/get-cookie",
          },
        ],
      },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "🤔 What is get-cookie?", link: "/guide/" },
            { text: "🚀 Getting Started", link: "/guide/getting-started" },
          ],
        },
        {
          text: "Essential Guides",
          items: [
            { text: "🛡️ Security & Privacy", link: "/guide/security" },
            { text: "🔍 Troubleshooting", link: "/guide/troubleshooting" },
            { text: "💻 CLI Usage", link: "/guide/cli-usage" },
            { text: "🚧 Known Limitations", link: "/guide/limitations" },
          ],
        },
        {
          text: "Advanced Topics",
          items: [
            { text: "🔐 Browser-Specific Details", link: "/guide/browsers" },
            { text: "🧪 Integration Testing", link: "/guide/testing" },
          ],
        },
      ],
      "/automation/": [
        {
          text: "Automation",
          items: [
            { text: "🤖 Overview", link: "/automation/" },
            { text: "📜 Shell Scripts", link: "/automation/shell-scripts" },
            { text: "⚡ Node.js Scripts", link: "/automation/nodejs-scripts" },
            {
              text: "🎭 Browser Automation",
              link: "/automation/browser-automation",
            },
            { text: "⏱️ Scheduled Tasks", link: "/automation/scheduled-tasks" },
            { text: "📊 Monitoring", link: "/automation/monitoring" },
            { text: "🔄 Error Recovery", link: "/automation/error-recovery" },
          ],
        },
        {
          text: "Best Practices",
          items: [
            { text: "🎯 Performance", link: "/automation/performance" },
            { text: "🛡️ Security", link: "/automation/security" },
            { text: "🔧 Maintenance", link: "/automation/maintenance" },
          ],
        },
      ],
      "/reference/": [
        {
          text: "API Reference",
          items: [
            { text: "📖 Overview", link: "/reference/" },
            { text: "⚙️ Core Functions", link: "/reference/modules" },
            { text: "📝 Type Definitions", link: "/reference/types" },
            { text: "🌐 Browser Strategies", link: "/reference/browsers" },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: "github", link: "https://github.com/mherod/get-cookie" },
      { icon: "npm", link: "https://www.npmjs.com/package/@mherod/get-cookie" },
    ],
    footer: {
      message: "🔒 Safe cookie extraction with proper encryption handling",
      copyright: "© 2024 Matthew Herod",
    },
    outline: {
      level: [2, 3],
      label: "On this page",
    },
    lastUpdated: {
      text: "Updated at",
      formatOptions: {
        dateStyle: "full",
        timeStyle: "medium",
      },
    },
    docFooter: {
      prev: "👈 Previous",
      next: "Next 👉",
    },
  },
  head: [
    ["link", { rel: "icon", href: "/get-cookie/favicon.ico" }],
    ["meta", { name: "theme-color", content: "#3eaf7c" }],
    ["meta", { name: "apple-mobile-web-app-capable", content: "yes" }],
    [
      "meta",
      { name: "apple-mobile-web-app-status-bar-style", content: "black" },
    ],
  ],
});
