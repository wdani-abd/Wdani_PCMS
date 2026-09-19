import { setAuthTokenGetter } from "@workspace/api-client-react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

type AuthUser = {
  id: string;
  email: string;
};

type AuthProfile = {
  id: string;
  fullName: string;
  role: "Admin" | "Property Manager";
};

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
  user: AuthUser;
  profile: AuthProfile;
  remember: boolean;
};

type AuthContextValue = {
  session: AuthSession | null;
  loading: boolean;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
};

const STORAGE_KEY = "milkiya.auth.session";
const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredSession(): AuthSession | null {
  for (const storage of [localStorage, sessionStorage]) {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) continue;
    try {
      const session = JSON.parse(raw) as AuthSession;
      if (session.accessToken && session.refreshToken && session.user?.id && session.profile?.id) return session;
    } catch {
      storage.removeItem(STORAGE_KEY);
    }
  }
  return null;
}

function writeStoredSession(session: AuthSession | null): void {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  if (!session) return;
  (session.remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(session));
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(data?.error || `تعذر إكمال الطلب (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => readStoredSession());
  const [loading, setLoading] = useState(true);
  const sessionRef = useRef(session);
  const refreshPromise = useRef<Promise<AuthSession> | null>(null);
  const sessionGeneration = useRef(0);

  const commitSession = (next: AuthSession | null) => {
    sessionRef.current = next;
    setSession(next);
    writeStoredSession(next);
  };

  const refreshSession = async (): Promise<AuthSession> => {
    const current = sessionRef.current;
    if (!current) throw new Error("لا توجد جلسة لتحديثها");
    if (!refreshPromise.current) {
      const generation = sessionGeneration.current;
      const pending = apiRequest<Omit<AuthSession, "remember">>("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken: current.refreshToken }),
      }).then((next) => {
        if (
          sessionGeneration.current !== generation ||
          sessionRef.current?.refreshToken !== current.refreshToken
        ) {
          throw new Error("تم تجاهل تحديث جلسة قديمة");
        }
        const refreshed = { ...next, remember: current.remember };
        commitSession(refreshed);
        return refreshed;
      }).finally(() => {
        if (refreshPromise.current === pending) refreshPromise.current = null;
      });
      refreshPromise.current = pending;
    }
    return refreshPromise.current;
  };

  const getAccessToken = async (): Promise<string | null> => {
    const current = sessionRef.current;
    if (!current) return null;
    if (current.expiresAt * 1000 > Date.now() + 60_000) return current.accessToken;
    try {
      return (await refreshSession()).accessToken;
    } catch {
      if (
        sessionRef.current?.refreshToken === current.refreshToken
      ) {
        sessionGeneration.current += 1;
        commitSession(null);
        return null;
      }
      return sessionRef.current?.accessToken ?? null;
    }
  };

  useEffect(() => {
    setAuthTokenGetter(getAccessToken);
    return () => setAuthTokenGetter(null);
  });

  useEffect(() => {
    let cancelled = false;
    const restore = async () => {
      const current = sessionRef.current;
      if (!current) {
        if (!cancelled) setLoading(false);
        return;
      }
      const generation = sessionGeneration.current;
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Session expired");
        const identity = await apiRequest<{ user: AuthUser; profile: AuthProfile }>("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (
          !cancelled &&
          sessionGeneration.current === generation &&
          sessionRef.current?.user.id === current.user.id
        ) {
          commitSession({ ...sessionRef.current, ...identity });
        }
      } catch {
        if (
          !cancelled &&
          sessionGeneration.current === generation &&
          sessionRef.current?.user.id === current.user.id
        ) {
          sessionGeneration.current += 1;
          commitSession(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string, remember: boolean) => {
    const generation = sessionGeneration.current + 1;
    sessionGeneration.current = generation;
    refreshPromise.current = null;
    const authenticated = await apiRequest<Omit<AuthSession, "remember">>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (sessionGeneration.current !== generation) {
      throw new Error("تم إلغاء محاولة تسجيل الدخول");
    }
    commitSession({ ...authenticated, remember });
  };

  const logout = async () => {
    let token: string | null = null;
    try {
      token = await getAccessToken();
    } finally {
      sessionGeneration.current += 1;
      refreshPromise.current = null;
      commitSession(null);
    }
    if (!token) return;
    await apiRequest<void>("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => undefined);
  };

  return (
    <AuthContext.Provider value={{ session, loading, login, logout, getAccessToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}

export function getApiErrorMessage(error: unknown): string {
  if (error && typeof error === "object") {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string") {
      return (data as { error: string }).error;
    }
  }
  return error instanceof Error ? error.message : "تعذر إكمال العملية";
}