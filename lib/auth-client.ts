import { createAuthClient } from "better-auth/client";
import { sentinelClient } from "@better-auth/infra/client";

export const authClient = createAuthClient({
  // Keep browser calls on the same origin as the Vercel/API handler. This
  // prevents signup and signin from silently targeting a different host.
  baseURL: "/api/auth",
  plugins: [
    sentinelClient(),
  ],
});
