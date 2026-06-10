import 'dotenv/config';

import { defineConfig } from 'prisma/config';

/** Used only when neither DIRECT_URL nor DATABASE_URL is set (e.g. CI `prisma generate`). */
const CI_PLACEHOLDER_DATABASE_URL = 'postgresql://ci:ci@127.0.0.1:5432/ci?schema=public';

const datasourceUrl =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim() || CI_PLACEHOLDER_DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Prisma 7: CLI/migrations use DIRECT_URL (Supabase session pooler); falls back to DATABASE_URL.
    url: datasourceUrl,
  },
});
