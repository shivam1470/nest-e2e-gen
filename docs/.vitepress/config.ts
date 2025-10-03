import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'nest-e2e-gen',
  description: 'Generate rich E2E test scaffolding & payloads directly from your NestJS code.',
  cleanUrls: true,
  base: '/nest-e2e-gen/', // GitHub Pages base (username.github.io/nest-e2e-gen)
  lastUpdated: true,
  themeConfig: {
    logo: { src: '/logo.svg', alt: 'nest-e2e-gen' },
    nav: [
      { text: 'Guide', link: '/' },
      { text: 'CLI', link: '/cli' },
      { text: 'Config', link: '/configuration' },
      { text: 'Advanced', link: '/advanced' },
      { text: 'GitHub', link: 'https://github.com/shivam1470/nest-e2e-gen' }
    ],
    sidebar: [
      {
        text: 'Getting Started',
        collapsed: false,
        items: [
          { text: 'Introduction', link: '/' },
          { text: 'Quick Start', link: '/getting-started' }
        ]
      },
      {
        text: 'Core',
        collapsed: false,
        items: [
          { text: 'CLI Reference', link: '/cli' },
          { text: 'Configuration', link: '/configuration' },
          { text: 'Mocking', link: '/mocking' }
        ]
      },
      {
        text: 'Advanced',
        collapsed: true,
        items: [
          { text: 'Advanced Usage', link: '/advanced' },
          { text: 'Release Process', link: '/release-process' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/shivam1470/nest-e2e-gen' }
    ],
    editLink: {
      pattern: 'https://github.com/shivam1470/nest-e2e-gen/edit/main/docs/:path',
      text: 'Edit this page on GitHub'
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: `Copyright © ${new Date().getFullYear()} Shivam Mishra`
    }
  }
});
