export interface NavPage {
  title: string;
  slug: string; // matches the MD filename without extension
}

export interface NavSection {
  title: string;
  slug: string; // matches the content subdirectory name
  pages: NavPage[];
}

export const nav: NavSection[] = [
  {
    title: 'Getting Started',
    slug: 'getting-started',
    pages: [
      { title: 'Introduction', slug: 'introduction' },
      { title: 'Quick Start', slug: 'quick-start' },
      { title: 'Installation', slug: 'installation' },
    ],
  },
  {
    title: 'Guides',
    slug: 'guides',
    pages: [
      { title: 'Example Apps', slug: 'example-apps' },
      { title: 'Creating Landing Pages', slug: 'creating-landing-pages' },
      { title: 'Environment Variables', slug: 'environment-variables' },
      { title: 'OAuth Login', slug: 'oauth-login' },
    ],
  },
  {
    title: 'Core Concepts',
    slug: 'core-concepts',
    pages: [
      { title: 'How It Works', slug: 'how-it-works' },
      { title: 'Intermediate Representation', slug: 'intermediate-representation' },
      { title: 'Adapters', slug: 'adapters' },
      { title: 'Config Reconciliation', slug: 'config-reconciliation' },
      { title: 'Layout System', slug: 'layout-system' },
    ],
  },
  {
    title: 'Supported Specs',
    slug: 'supported-specs',
    pages: [
      { title: 'Overview', slug: 'overview' },
    ],
  },
  {
    title: 'Views & Components',
    slug: 'views-and-components',
    pages: [
      { title: 'Overview', slug: 'overview' },
      { title: 'List View', slug: 'list-view' },
      { title: 'Detail View', slug: 'detail-view' },
      { title: 'Form View', slug: 'form-view' },
      { title: 'Edit Form View', slug: 'edit-form-view' },
      { title: 'Search View', slug: 'search-view' },
      { title: 'Dashboard View', slug: 'dashboard-view' },
      { title: 'Wizard View', slug: 'wizard-view' },
      { title: 'Login View', slug: 'login-view' },
      { title: 'Profile View', slug: 'profile-view' },
      { title: 'Field Components', slug: 'field-components' },
    ],
  },
  {
    title: 'Authentication',
    slug: 'authentication',
    pages: [
      { title: 'Overview', slug: 'overview' },
      { title: 'Bearer Token', slug: 'bearer-token' },
      { title: 'API Key', slug: 'api-key' },
      { title: 'HTTP Basic', slug: 'http-basic' },
      { title: 'Credential Login', slug: 'credential-login' },
      { title: 'OAuth Configuration', slug: 'oauth-configuration' },
      { title: 'OAuth Security', slug: 'oauth-security' },
      { title: 'OAuth Troubleshooting', slug: 'oauth-troubleshooting' },
      { title: 'Google OAuth Setup', slug: 'oauth-google-setup' },
      { title: 'GitHub OAuth Setup', slug: 'oauth-github-setup' },
      { title: 'Microsoft OAuth Setup', slug: 'oauth-microsoft-setup' },
      { title: 'Facebook OAuth Setup', slug: 'oauth-facebook-setup' },
    ],
  },
  {
    title: 'Spec Annotations',
    slug: 'spec-annotations',
    pages: [
      { title: 'Overview', slug: 'overview' },
      { title: 'x-uigen-app', slug: 'x-uigen-app' },
      { title: 'x-uigen-label', slug: 'x-uigen-label' },
      { title: 'x-uigen-id', slug: 'x-uigen-id' },
      { title: 'x-uigen-ignore', slug: 'x-uigen-ignore' },
      { title: 'x-uigen-ref', slug: 'x-uigen-ref' },
      { title: 'x-uigen-chart', slug: 'x-uigen-chart' },
      { title: 'x-uigen-layout', slug: 'x-uigen-layout' },
      { title: 'x-uigen-profile', slug: 'x-uigen-profile' },
      { title: 'x-uigen-landing-page', slug: 'x-uigen-landing-page' },
      { title: 'x-uigen-datetime', slug: 'x-uigen-datetime' },
      { title: 'x-uigen-datetime-tz', slug: 'x-uigen-datetime-tz' },
      { title: 'x-uigen-auth', slug: 'x-uigen-auth' },
      { title: 'HTTP Method Override', slug: 'x-uigen-http-method-override' },
      { title: 'File Upload Metadata', slug: 'x-uigen-file-metadata' },
      { title: 'Planned Annotations', slug: 'planned-annotations' },
    ],
  },
  {
    title: 'Override System',
    slug: 'override-system',
    pages: [
      { title: 'Overview', slug: 'overview' },
      { title: 'Component Mode', slug: 'component-mode' },
      { title: 'Render Mode', slug: 'render-mode' },
      { title: 'Use Hooks Mode', slug: 'use-hooks-mode' },
      { title: 'Override ID Addressing', slug: 'override-id-addressing' },
    ],
  },
  {
    title: 'CLI Reference',
    slug: 'cli-reference',
    pages: [
      { title: 'init', slug: 'init' },
      { title: 'serve', slug: 'serve' },
      { title: 'Electron Target', slug: 'electron-target' },
      { title: 'config', slug: 'config' },
      { title: 'build', slug: 'build' },
      { title: 'Planned Commands', slug: 'planned-commands' },
    ],
  },
  {
    title: 'Payments',
    slug: 'payments',
    pages: [
      { title: 'Overview', slug: 'overview' },
      { title: 'Stripe Setup', slug: 'stripe-setup' },
      { title: 'PayPal Setup', slug: 'paypal-setup' },
      { title: 'Payment Gates', slug: 'payment-gates' },
      { title: 'Webhooks', slug: 'webhooks' },
      { title: 'Security', slug: 'security' },
    ],
  },
  {
    title: 'Extending UIGen',
    slug: 'extending-uigen',
    pages: [
      { title: 'Overview', slug: 'overview' },
      { title: 'Config GUI Plugins', slug: 'config-gui-plugins' },
    ],
  },
  {
    title: 'Roadmap',
    slug: 'roadmap',
    pages: [
      { title: 'Roadmap', slug: 'index' },
    ],
  },
  {
    title: 'Contributing',
    slug: 'contributing',
    pages: [
      { title: 'Contributing', slug: 'index' },
    ],
  },
];
