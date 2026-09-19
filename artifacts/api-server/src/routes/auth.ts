import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth, type SupabaseUser } from "../middleware/auth";
import { SupabaseHttpError, supabaseRequest } from "../lib/supabase";

type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  user: SupabaseUser;
};

type ProfileRow = {
  id: string;
  full_name: string;
  role: "Admin" | "Property Manager";
};

function sessionResponse(session: SupabaseSession, profile: ProfileRow) {
  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    expiresIn: session.expires_in,
    expiresAt: session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in,
    user: {
      id: session.user.id,
      email: session.user.email ?? "",
    },
    profile: {
      id: profile.id,
      fullName: profile.full_name,
      role: profile.role,
    },
  };
}

async function profileFor(accessToken: string, userId: string): Promise<ProfileRow | null> {
  const rows = await supabaseRequest<ProfileRow[]>(
    `/rest/v1/profiles?select=id,full_name,role&id=eq.${encodeURIComponent(userId)}`,
    {},
    accessToken,
  );
  return rows[0] ?? null;
}

async function completeSession(res: Response, session: SupabaseSession): Promise<void> {
  const profile = await profileFor(session.access_token, session.user.id);
  if (!profile) {
    res.status(403).json({
      error: "الحساب مسجل في Supabase Auth لكنه غير مربوط بملف صلاحيات. اطلب من المسؤول إضافته إلى profiles.",
    });
    return;
  }
  res.json(sessionResponse(session, profile));
}

const router: IRouter = Router();

router.post("/auth/login", async (req: Request, res: Response, next) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!email || !password) {
    res.status(400).json({ error: "البريد الإلكتروني وكلمة المرور مطلوبان" });
    return;
  }

  try {
    const session = await supabaseRequest<SupabaseSession>("/auth/v1/token?grant_type=password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    await completeSession(res, session);
  } catch (error) {
    if (error instanceof SupabaseHttpError && (error.status === 400 || error.status === 401)) {
      res.status(401).json({ error: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
      return;
    }
    next(error);
  }
});

router.post("/auth/refresh", async (req: Request, res: Response, next) => {
  const refreshToken = typeof req.body?.refreshToken === "string" ? req.body.refreshToken : "";
  if (!refreshToken) {
    res.status(400).json({ error: "رمز تحديث الجلسة مطلوب" });
    return;
  }

  try {
    const session = await supabaseRequest<SupabaseSession>("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    await completeSession(res, session);
  } catch (error) {
    if (error instanceof SupabaseHttpError && (error.status === 400 || error.status === 401)) {
      res.status(401).json({ error: "تعذر تحديث الجلسة، سجّل الدخول مرة أخرى" });
      return;
    }
    next(error);
  }
});

router.get("/auth/me", requireAuth, async (req: Request, res: Response, next) => {
  try {
    const profile = await profileFor(req.auth!.accessToken, req.auth!.user.id);
    if (!profile) {
      res.status(403).json({ error: "لا يوجد ملف صلاحيات مرتبط بهذا الحساب" });
      return;
    }
    res.json({
      user: { id: req.auth!.user.id, email: req.auth!.user.email ?? "" },
      profile: { id: profile.id, fullName: profile.full_name, role: profile.role },
    });
  } catch (error) {
    next(error);
  }
});

router.post("/auth/logout", requireAuth, async (req: Request, res: Response, next) => {
  try {
    await supabaseRequest<void>("/auth/v1/logout", { method: "POST" }, req.auth!.accessToken);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;