import type { NextFunction, Request, Response } from "express";
import { SupabaseHttpError, supabaseRequest } from "../lib/supabase";

export type SupabaseUser = {
  id: string;
  email?: string;
};

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const accessToken = bearerToken(req);
  if (!accessToken) {
    res.status(401).json({ error: "يجب تسجيل الدخول أولاً" });
    return;
  }

  try {
    const user = await supabaseRequest<SupabaseUser>("/auth/v1/user", {}, accessToken);
    req.auth = { accessToken, user };
    next();
  } catch (error) {
    if (error instanceof SupabaseHttpError && (error.status === 401 || error.status === 403)) {
      res.status(401).json({ error: "انتهت جلسة الدخول أو أن رمز الوصول غير صالح" });
      return;
    }
    next(error);
  }
}