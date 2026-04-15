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
    title: 'Core Concepts',
    slug: 'core-concepts',
    pages: [
      { title: 'How It Works', slug: 'how-it-works' },
      { title: 'Intermediate Representation', slug: 'intermediate-representation' },
      { title: 'Adapters', slug: 'adapters' },
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
    ],
  },
  {
    title: 'Spec Annotations',
    slug: 'spec-annotations',
    pages: [
      { title: 'Overview', slug: 'overview' },
      { title: 'x-uigen-label', slug: 'x-uigen-label' },
      { title: 'x-uigen-id', slug: 'x-uigen-id' },
      { title: 'x-uigen-ignore', slug: 'x-uigen-ignore' },
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
      { title: 'serve', slug: 'serve' },
      { title: 'Planned Commands', slug: 'planned-commands' },
    ],
  },
  {
    title: 'Extending UIGen',
    slug: 'extending-uigen',
    pages: [
      { title: 'Overview', slug: 'overview' },
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
