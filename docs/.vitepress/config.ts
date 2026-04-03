import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'cantonjs',
  description: 'Application-side TypeScript SDK for Canton participant Ledger API V2',
  base: '/cantonjs/',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: 'Core SDK', link: '/guide/getting-started' },
      { text: 'Ecosystem Fit', link: '/guide/ecosystem-fit' },
      { text: 'Positioning', link: '/positioning' },
      { text: 'Add-Ons', link: '/guide/scan' },
      { text: 'API', link: '/api/' },
      { text: 'Examples', link: '/examples/' },
      {
        text: 'Packages',
        items: [
          { text: 'cantonjs-codegen', link: '/packages/codegen' },
          { text: 'cantonjs-react', link: '/packages/react' },
        ],
      },
    ],
    sidebar: {
      '/guide/': [
        {
          text: 'Introduction',
          items: [
            { text: 'Positioning & Boundaries', link: '/positioning' },
            { text: 'Ecosystem Fit', link: '/guide/ecosystem-fit' },
            { text: 'Getting Started', link: '/guide/getting-started' },
            { text: 'Why cantonjs?', link: '/guide/why-cantonjs' },
          ],
        },
        {
          text: 'Core Concepts',
          items: [
            { text: 'Transport', link: '/guide/transport' },
            { text: 'LedgerClient', link: '/guide/ledger-client' },
            { text: 'AdminClient', link: '/guide/admin-client' },
            { text: 'Streaming', link: '/guide/streaming' },
            { text: 'Error Handling', link: '/guide/errors' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Codegen', link: '/guide/codegen' },
            { text: 'Testing', link: '/guide/testing' },
            { text: 'React Hooks', link: '/guide/react' },
            { text: 'Migration from Older Daml JS', link: '/guide/migration' },
          ],
        },
        {
          text: 'Splice',
          items: [
            { text: 'Public Scan', link: '/guide/scan' },
            { text: 'Validator ANS', link: '/guide/validator-ans' },
            { text: 'Token Standard', link: '/guide/token-standard' },
            { text: 'Wallet Adapters', link: '/guide/wallet-adapters' },
            { text: 'GA vs Experimental', link: '/guide/ga-vs-experimental' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Clients', link: '/api/clients' },
            { text: 'Transport', link: '/api/transport' },
            { text: 'Streaming', link: '/api/streaming' },
            { text: 'Types', link: '/api/types' },
            { text: 'Errors', link: '/api/errors' },
            { text: 'Chains', link: '/api/chains' },
          ],
        },
      ],
      '/examples/': [
        {
          text: 'Examples',
          items: [
            { text: 'Overview', link: '/examples/' },
            { text: 'Basic Contract Operations', link: '/examples/basic' },
            { text: 'Streaming Updates', link: '/examples/streaming' },
            { text: 'Participant React App', link: '/examples/react' },
          ],
        },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/merged-one/cantonjs' },
    ],
    footer: {
      message: 'Released under the Apache 2.0 License.',
      copyright: 'Copyright 2026 Charles Dusek',
    },
    search: {
      provider: 'local',
    },
  },
})
