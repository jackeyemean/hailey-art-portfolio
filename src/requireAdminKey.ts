import { Request, Response, NextFunction } from "express";

const ADMIN_KEY = process.env.ADMIN_KEY;

export function requireAdminKey(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const key = req.header("x-admin-key");
  if (key !== ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
