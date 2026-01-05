import { VercelRequest, VercelResponse } from '@vercel/node';

export function requireAdminKey(req: VercelRequest, res: VercelResponse, next: () => void) {
  const adminKey = req.headers['x-admin-key'] as string;
  const expectedKey = process.env.ADMIN_KEY;

  if (!adminKey || adminKey !== expectedKey) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}
