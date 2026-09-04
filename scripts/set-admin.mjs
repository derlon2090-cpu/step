import 'dotenv/config';
import postgres from 'postgres';

const userId = process.argv[2];
if (!userId) throw new Error('Usage: npm run db:set-admin -- <better-auth-user-id>');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
await sql`INSERT INTO profiles (user_id, display_name, role) VALUES (${userId}, NULL, 'admin')
  ON CONFLICT (user_id) DO UPDATE SET role='admin', updated_at=now()`;
await sql.end();
console.log(`Profile ${userId} is now admin. No email is hard-coded.`);

