import { SiteHeader } from "../components/SiteHeader";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)] text-[var(--foreground)] font-[var(--font-geist-sans,sans-serif)]">
      <SiteHeader variant="marketing" />

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-24 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-4 max-w-3xl">
          Runtime frontend  <span className="text-[var(--primary)]">for OpenAPI specs</span>
        </h1>

        <p className="text-base md:text-lg text-gray-500 dark:text-gray-400 max-w-lg mb-10 leading-relaxed">
          From OpenAPI to production-ready UI. Optional code. Optional config.
          <br />
          <span className="text-sm">Includes a framework agnostic core and pluggable renderers.</span>
        </p>

        {/* CLI snippet */}
        <div className="w-full max-w-lg mb-10">
          <div className="bg-gray-950 dark:bg-gray-900 rounded-xl border border-gray-800 overflow-hidden text-left shadow-xl">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-800">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <span className="w-3 h-3 rounded-full bg-green-500/70" />
            </div>
            <pre className="px-5 py-4 text-sm text-gray-100 overflow-x-auto">
              <code>
                <span className="text-gray-500">$</span>{" "}
                <span className="text-[var(--primary)]">npx</span>{" "}
                <span className="text-white">@uigen-dev/cli@latest init</span>{" "}
                <span className="text-yellow-300">my-app</span>
                {"\n"}
                <span className="text-gray-500">
                  # → Scaffolds project with config, theme, and AI skills
                </span>
                {"\n\n"}
                <span className="text-gray-500">$</span>{" "}
                <span className="text-[var(--primary)]">npx</span>{" "}
                <span className="text-white">@uigen-dev/cli@latest serve</span>{" "}
                <span className="text-yellow-300">openapi.yaml</span>
                {"\n"}
                <span className="text-gray-500">
                  # → Your UI is live at http://localhost:4400
                </span>
              </code>
            </pre>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href="https://github.com/darula-hpp/uigen"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white rounded-lg font-medium transition-colors text-sm"
          >
            Star on GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/@uigen-dev/cli"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 border border-[var(--border)] hover:bg-gray-50 dark:hover:bg-gray-900 rounded-lg font-medium transition-colors text-sm"
          >
            View on npm
          </a>
        </div>
      </main>

      {/* Features strip */}
      <section className="px-6 py-16 border-t border-[var(--border)]" aria-label="Features">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-8 text-center">
            Everything you need from an OpenAPI frontend generator
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {features.map((f) => (
            <div
              key={f.title}
              className="p-5 rounded-xl border border-[var(--border)] bg-gray-50 dark:bg-transparent"
            >
              <div className="w-8 h-8 mb-3 text-[var(--primary)]">
                <f.icon />
              </div>
              <h3 className="font-semibold mb-1 text-sm">{f.title}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                {f.description}
              </p>
            </div>
          ))}
          </div>
        </div>
      </section>
      <section className="px-6 py-16 border-t border-[var(--border)] bg-gray-50 dark:bg-transparent">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-3">What&apos;s shipping</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            The core engine is live on npm. Docs are live too.
          </p>
          <ul className="text-left space-y-3 max-w-sm mx-auto">
            {roadmap.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                    item.done
                      ? "bg-teal-100 dark:bg-teal-900/40 text-[var(--primary)]"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-400"
                  }`}
                >
                  {item.done ? "✓" : "·"}
                </span>
                <span
                  className={
                    item.done ? "" : "text-gray-400 dark:text-gray-500"
                  }
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-400">
        <span>© {new Date().getFullYear()} UIGen</span>
        <div className="flex gap-4">
          <a
            href="https://github.com/darula-hpp/uigen"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--primary)] transition-colors"
          >
            GitHub
          </a>
          <a
            href="https://www.npmjs.com/package/@uigen-dev/cli"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[var(--primary)] transition-colors"
          >
            npm
          </a>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        {/* AI sparkles / automation */}
        <path d="M12 3v3m0 12v3m9-9h-3M6 12H3m15.364 6.364l-2.121-2.121M8.757 8.757 6.636 6.636m12.728 0-2.121 2.121M8.757 15.243l-2.121 2.121" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
    title: "AI-assisted config & theming",
    description:
      "Built-in AI skills auto-detect auth, relationships, file uploads, and generate custom themes. Zero manual configuration needed.",
  },
  {
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        {/* Sparkle / zero-config: a simple "magic wand" style */}
        <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
      </svg>
    ),
    title: "Zero boilerplate",
    description:
      "Drop in an OpenAPI spec and get tables, forms, auth, and pagination with no code to write.",
  },
  {
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        {/* Proxy / live calls: arrows cycling through a server */}
        <path d="M5 12H19" />
        <path d="m15 16 4-4-4-4" />
        <rect x="2" y="6" width="6" height="12" rx="1" />
      </svg>
    ),
    title: "Live API calls",
    description:
      "A built-in proxy forwards requests to your real backend. No mocking needed.",
  },
  {
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        {/* Lock / auth */}
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
    title: "Auth out of the box",
    description:
      "Bearer token, API Key, HTTP Basic, and credential-based login flows, all auto-detected.",
  },
  {
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        {/* Half-circle sun/moon: theme toggle */}
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    ),
    title: "Dark / light theme",
    description:
      "Built-in toggle with system preference detection, persisted to local storage.",
  },
  {
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        {/* Layers: framework agnostic */}
        <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
        <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
        <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
      </svg>
    ),
    title: "Framework agnostic IR",
    description:
      "The core IR is framework-agnostic. React is the default; Svelte and Vue renderers are planned.",
  },
  {
    icon: () => (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full">
        {/* Sliders: override / customise */}
        <line x1="4" x2="4" y1="21" y2="14" />
        <line x1="4" x2="4" y1="10" y2="3" />
        <line x1="12" x2="12" y1="21" y2="12" />
        <line x1="12" x2="12" y1="8" y2="3" />
        <line x1="20" x2="20" y1="21" y2="16" />
        <line x1="20" x2="20" y1="12" y2="3" />
        <line x1="2" x2="6" y1="14" y2="14" />
        <line x1="10" x2="14" y1="8" y2="8" />
        <line x1="18" x2="22" y1="16" y2="16" />
      </svg>
    ),
    title: "Override system",
    description:
      "Selectively replace any auto-generated view with your own component, opt in per view.",
  },
];

const roadmap = [
  { label: "Core IR engine", done: true },
  { label: "React renderer", done: true },
  { label: "CLI (npx @uigen-dev/cli)", done: true },
  { label: "Swagger 2.0 support", done: true },
  { label: "Override system", done: true },
  { label: "Docs site", done: true },
  { label: "x-uigen-* spec annotations", done: true },
  { label: ".uigen/config.yaml system", done: true },
  { label: "Config GUI", done: true },
  { label: "AI agent skills", done: true },
  { label: "OAuth2 PKCE flow", done: false },
  { label: "Svelte & Vue renderers", done: false },
];
