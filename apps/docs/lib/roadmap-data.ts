export type RoadmapPhaseStatus = 'complete' | 'in-progress' | 'planned';

export interface RoadmapItem {
  label: string;
  done: boolean;
}

export interface RoadmapPhase {
  title: string;
  status: RoadmapPhaseStatus;
  items: RoadmapItem[];
}

export const roadmapPhases: RoadmapPhase[] = [
  {
    title: 'Phase 1: Core vertical slice',
    status: 'complete',
    items: [
      { label: 'Monorepo scaffold (pnpm + Vite + TypeScript)', done: true },
      { label: 'IR types (auth, relationships, pagination hints, validation rules)', done: true },
      { label: 'OpenAPI 3.x adapter with full `$ref` resolution', done: true },
      { label: 'Swagger 2.0 adapter', done: true },
      { label: 'View hint classifier (list, detail, create, update, delete, search, wizard, action)', done: true },
      { label: 'Relationship detector (hasMany / belongsTo)', done: true },
      { label: 'Pagination detector (offset, cursor, page-based)', done: true },
      { label: 'Core field components (TextField, NumberField, SelectField, DatePicker, FileUpload, ArrayField, ObjectField)', done: true },
      { label: 'ListView with TanStack Table: sorting, pagination, filtering, row actions', done: true },
      { label: 'FormView with React Hook Form + Zod validation', done: true },
      { label: 'CLI `serve` command with Vite proxy', done: true },
      { label: 'Opinionated theme (shadcn/ui dark/light toggle)', done: true },
      { label: 'Authentication UI (Bearer token + API Key)', done: true },
      { label: 'Environment switching (server dropdown from spec `servers`)', done: true },
      { label: 'Error resilience (graceful degradation, error boundary, toast notifications)', done: true },
    ],
  },
  {
    title: 'Phase 2: Full surface area',
    status: 'complete',
    items: [
      { label: 'DetailView with related resource links', done: true },
      { label: 'EditFormView (pre-populated from current record)', done: true },
      { label: 'Delete with confirmation dialog', done: true },
      { label: 'Custom action buttons (non-CRUD operations)', done: true },
      { label: 'SearchView (global + per-resource filters)', done: true },
      { label: 'DashboardView (auto-generated overview with resource counts)', done: true },
      { label: 'WizardView (multi-step for large forms)', done: true },
      { label: 'Sidebar layout + TopBar + Breadcrumbs + responsive shell', done: true },
      { label: 'React Router with full URL navigation and browser history', done: true },
      { label: 'Config reconciliation system (runtime annotation merging from `.uigen/config.yaml`)', done: true },
      { label: 'Built-in list charts via `x-uigen-chart` (Recharts, query limits, client-side sampling, filter controls)', done: true },
      { label: 'Declarative WebSocket live updates via `x-uigen-websocket` and `x-uigen-detail-stream`', done: true },
      { label: 'Unified HTTP + WebSocket API proxy on `/api` for `uigen serve`', done: true },
    ],
  },
  {
    title: 'Phase 3: Extension & distribution',
    status: 'in-progress',
    items: [
      { label: '`x-uigen-*` vendor extension support (label, ignore, ref, chart, websocket, detail-stream, layout, profile, landing page, auth, datetime)', done: true },
      { label: '`.uigen/config.yaml`: theme/behaviour/resource overrides', done: true },
      { label: '`uigen build`: package config, spec, and overrides for deployment', done: true },
      { label: 'Publish core packages to npm (`@uigen-dev/core`, `@uigen-dev/react`, `@uigen-dev/cli`)', done: true },
      { label: 'Electron desktop target (`uigen serve --target electron`, `@uigen-dev/target-electron`)', done: true },
      { label: 'OAuth 2.0 social login (Google, GitHub, Facebook, Microsoft) via `x-uigen-auth`', done: true },
      { label: 'Standalone Electron packaging (`.dmg` / `.exe` via `electron-builder`)', done: false },
      { label: '`uigen validate`: spec linting with actionable errors and line numbers', done: false },
      { label: '`uigen generate`: static production HTML build output', done: false },
      { label: 'OAuth2 PKCE for web SPA (public clients without client secret)', done: false },
      { label: 'Spec hot-reloading (file watcher pushes IR changes to the UI)', done: false },
      { label: 'Loading skeletons with shimmer animation', done: false },
      { label: 'Virtual scrolling for large datasets (TanStack Virtual)', done: false },
      { label: 'Request / response interceptors (config-driven middleware)', done: false },
      { label: 'Response transformation (JSONPath + JS functions)', done: false },
    ],
  },
  {
    title: 'Phase 4: Renderer ecosystem',
    status: 'planned',
    items: [
      { label: '`@uigen-dev/svelte`: Svelte renderer consuming the same IR', done: false },
      { label: '`@uigen-dev/vue`: Vue 3 renderer', done: false },
      { label: '`@uigen-dev/react-native`: React Native renderer for device companion apps', done: false },
      { label: 'Plugin API: register custom adapters, field types, and view strategies as npm packages', done: false },
      { label: '`uigen ui:config`: visual configuration dashboard', done: false },
      { label: '`@uigen-dev/plugin-charts`: additional chart widgets and custom renderers beyond built-in list charts', done: false },
      { label: '`@uigen-dev/plugin-mapbox`: map renderer for geo coordinate fields', done: false },
      { label: 'GraphQL adapter', done: false },
      { label: 'OpenAPI 3.1 full support', done: false },
    ],
  },
];

export const roadmapPriorities: string[] = [
  'Polish (WebSocket streaming UX, chart performance, relationship visualization)',
  'Better relationship handling and visualization',
  'Additional renderers (Svelte, Vue, React Native for device companion apps)',
];

/** Homepage summary rows (high-level shipped vs planned). */
export const homepageRoadmapItems: RoadmapItem[] = [
  { label: 'Core IR engine', done: true },
  { label: 'React renderer', done: true },
  { label: 'CLI (npx @uigen-dev/cli)', done: true },
  { label: 'Built-in charts (x-uigen-chart)', done: true },
  { label: 'Live WebSocket streams', done: true },
  { label: 'Electron desktop target', done: true },
  { label: 'Override system', done: true },
  { label: 'AI agent skills', done: true },
  { label: 'OAuth 2.0 social login', done: true },
  { label: 'Docs site', done: true },
  { label: 'Svelte, Vue & React Native renderers', done: false },
  { label: 'OAuth2 PKCE for web SPA', done: false },
];

/** Plain text for docs search indexing. */
export function getRoadmapSearchText(): string {
  const phaseText = roadmapPhases
    .flatMap((phase) => [phase.title, ...phase.items.map((item) => item.label)])
    .join('\n');
  return [phaseText, ...roadmapPriorities].join('\n');
}
