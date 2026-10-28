/** Shared Hono environment types for route handlers and middleware. */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string | null;
}

export type AppEnv = {
  Variables: {
    /** Authenticated caller, set by requireAuth. */
    user: AuthUser;
    /** Supabase client bound to the caller's JWT, so RLS applies. */
    db: SupabaseClient;
  };
};
