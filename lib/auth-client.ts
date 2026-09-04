import { createAuthClient } from "better-auth/client";
import { sentinelClient } from "@better-auth/infra/client";

export const authClient = createAuthClient({
  // Better Auth resolves its default /api/auth path against the current
  // origin. Keeping it implicit also works in both Vite and Vercel builds.
  plugins: [
    sentinelClient(),
  ],
});
