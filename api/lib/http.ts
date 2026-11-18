// Shared plumbing for the serverless routes: CORS, JSON body parsing, admin auth and errors.
import { supabase } from './supabase';

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
type RouteHandler = (req: any, res: any, body: any) => Promise<unknown>;

// The deployed admin, plus any localhost port so the admin can be run locally against this API
const ALLOWED_ORIGINS = ['https://hailey-web-admin.vercel.app'];
const LOCAL_ORIGIN = /^http:\/\/localhost:\d+$/;

// Thrown by route code to send a specific status and message instead of a 500
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function setCors(req: any, res: any, methods: string[]) {
  const origin = req.headers.origin;
  const allowed = origin && (ALLOWED_ORIGINS.includes(origin) || LOCAL_ORIGIN.test(origin));
  res.setHeader('Access-Control-Allow-Origin', allowed ? origin : ALLOWED_ORIGINS[0]);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', [...methods, 'OPTIONS'].join(', '));
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-key');
}

// Vercel only parses JSON bodies for some content types, so handle a raw string too
function parseBody(req: any) {
  if (typeof req.body !== 'string') return req.body || {};
  try {
    return JSON.parse(req.body);
  } catch {
    throw new HttpError(400, 'Invalid JSON');
  }
}

// Notes the time of the latest change to the site's content, for the publish screen
async function recordEdit() {
  const { error } = await supabase.from('SiteState').upsert({ key: 'lastEditAt', value: new Date().toISOString() });
  if (error) console.error('Could not record edit time:', error.message);
}

/**
 * Builds a route from per-method handlers. Every method except GET requires the admin key.
 * Successful writes are recorded as content edits unless `recordsEdits` is false.
 */
export function route(handlers: Partial<Record<Method, RouteHandler>>, { recordsEdits = true } = {}) {
  const methods = Object.keys(handlers);

  return async function handler(req: any, res: any) {
    setCors(req, res, methods);
    if (req.method === 'OPTIONS') return res.status(200).end();

    console.log('API Request:', req.method, req.url);

    const fn = handlers[req.method as Method];
    if (!fn) return res.status(405).json({ error: 'Method not allowed' });

    if (req.method !== 'GET') {
      const adminKey = req.headers['x-admin-key'];
      if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    try {
      const result = await fn(req, res, parseBody(req));
      if (recordsEdits && req.method !== 'GET') await recordEdit();
      if (!res.headersSent) res.status(200).json(result ?? null);
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message });
      }
      console.error('API Error:', error);
      return res.status(500).json({ error: 'Internal server error', details: error?.message });
    }
  };
}

// Supabase returns PGRST116 when .single() matches no rows
export function notFoundIfMissing<T>(result: { data: T | null; error: any }, what: string): T {
  if (result.error?.code === 'PGRST116' || (!result.error && !result.data)) {
    throw new HttpError(404, `${what} not found`);
  }
  if (result.error) throw result.error;
  return result.data as T;
}

export function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `${field} is required`);
  }
  return value.trim();
}
