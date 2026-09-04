import { getAuth } from './auth.js';
import { getDb } from '../db/index.js';
import { profiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }

export async function getSession(request) {
  return getAuth().api.getSession({ headers: request.headers });
}

export async function requireUser(request) {
  const session = await getSession(request);
  if (!session?.user) throw new HttpError(401, 'Unauthorized');
  const db = getDb();
  const [profile] = await db.select().from(profiles).where(eq(profiles.userId, session.user.id)).limit(1);
  if (profile) return { user: session.user, profile };
  const [created] = await db.insert(profiles).values({ userId: session.user.id, displayName: session.user.name ?? null, avatarUrl: session.user.image ?? null }).onConflictDoNothing({ target: profiles.userId }).returning();
  return { user: session.user, profile: created ?? (await db.select().from(profiles).where(eq(profiles.userId, session.user.id)).limit(1))[0] };
}

export async function requireAdmin(request) {
  const identity = await requireUser(request);
  if (identity.profile?.role !== 'admin') throw new HttpError(403, 'Forbidden');
  return identity;
}

