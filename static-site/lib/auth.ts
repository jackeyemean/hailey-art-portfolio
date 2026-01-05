import { NextRequest, NextResponse } from 'next/server';

const ADMIN_KEY = process.env.ADMIN_KEY;

export function requireAdminKey(req: NextRequest): boolean {
  const key = req.headers.get('x-admin-key');
  
  if (key !== ADMIN_KEY) {
    return false;
  }
  
  return true;
}
