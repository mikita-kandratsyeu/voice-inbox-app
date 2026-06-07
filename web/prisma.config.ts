import 'dotenv/config';

import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Prisma 7: CLI/migrations use DIRECT_URL (Supabase session pooler); falls back to DATABASE_URL.
    url: process.env.DIRECT_URL?.trim() || env('DATABASE_URL'),
  },
});
