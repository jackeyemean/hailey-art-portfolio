// Minimal GitHub REST client for publishing, using the GITHUB_TOKEN environment variable
// (a fine-grained token limited to this repository: Actions and Contents read/write).
import { HttpError } from './http';

export const REPO = 'jackeyemean/hailey-art-portfolio';
export const LIVE_BRANCH = 'main';
export const PREVIEW_BRANCH = 'preview';
export const SYNC_WORKFLOW = 'sync-preview.yml';

// The commit status / deployment environment names Vercel reports for the public site
export const SITE_STATUS_CONTEXT = 'Vercel – hailey-art';
export const SITE_PREVIEW_ENVIRONMENT = 'Preview – hailey-art';

export async function github<T = any>(path: string, init: { method?: string; body?: unknown } = {}): Promise<{ status: number; data: T }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new HttpError(503, 'Publishing is not set up yet (GITHUB_TOKEN is missing).');

  const res = await fetch(`https://api.github.com/repos/${REPO}${path}`, {
    method: init.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'admin-atelier',
      ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // not JSON
  }
  if (res.status === 401 || res.status === 403) {
    throw new HttpError(503, 'GitHub refused the request. The publishing token may have expired.');
  }
  return { status: res.status, data };
}
