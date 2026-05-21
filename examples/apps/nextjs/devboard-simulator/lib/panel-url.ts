export function getPanelUrl(): string {
  return process.env.NEXT_PUBLIC_PANEL_URL ?? 'http://localhost:4400';
}
