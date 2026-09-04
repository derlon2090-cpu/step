import 'dotenv/config';
import fs from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
const dir = path.resolve('drizzle');
const files = (await fs.readdir(dir)).filter((file) => file.endsWith('.sql')).sort();
for (const file of files) {
  console.log(`Applying ${file}`);
  await sql.file(path.join(dir, file));
}
await sql.end();
console.log(`Applied ${files.length} migration(s).`);

