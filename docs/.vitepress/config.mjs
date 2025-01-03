import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Get Cookie Documentation",
  description: "Documentation for the get-cookie Node.js module",
  base: '/get-cookie/',
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/guide/' },
          { text: 'Getting Started', link: '/guide/getting-started' },
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'Core API', link: '/api/' },
          { text: 'Browser Support', link: '/api/browsers' },
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/mherod/get-cookie' }
    ]
  }
})
