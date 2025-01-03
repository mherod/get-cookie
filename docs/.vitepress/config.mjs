import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "get-cookie 🍪",
  description: "Securely retrieve browser cookies from your local browsers",
  base: '/get-cookie/',
  themeConfig: {
    nav: [
      { text: '🏠 Home', link: '/' },
      { text: '📚 Guide', link: '/guide/' },
      { text: '🔧 API Reference', link: '/reference/' }
    ],
    sidebar: [
      {
        text: '📚 Guide',
        items: [
          { text: '🤔 What is get-cookie?', link: '/guide/' },
          { text: '🚀 Getting Started', link: '/guide/getting-started' }
        ]
      },
      {
        text: '🔧 API Reference',
        items: [
          { text: '📖 Overview', link: '/reference/' },
          { text: '⚙️ Core', link: '/reference/modules' },
          { text: '📝 Types', link: '/reference/types' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/mherod/get-cookie' }
    ],
    footer: {
      message: '🔒 Safe cookie extraction with proper encryption handling',
      copyright: '© 2024 Matthew Herod'
    }
  }
})