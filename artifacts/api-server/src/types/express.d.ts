import type { SupabaseUser } from "../middleware/auth";

declare global {
  namespace Express {
    interface Request {
      auth?: {
        accessToken: string;
        user: SupabaseUser;
      };
    }
  }
}

export {};