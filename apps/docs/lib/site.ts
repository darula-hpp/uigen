export const SITE_URL = 'https://getuigen.dev';

export function absoluteUrl(path = ''): string {
  if (!path || path === '/') {
    return SITE_URL;
  }

  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
