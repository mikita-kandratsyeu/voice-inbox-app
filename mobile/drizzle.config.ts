import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const nodeEnv = (process.env.NODE_ENV ?? 'development').trim().toLowerCase();
const isDev = nodeEnv === 'development';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/shared/lib/db/schema.ts',
  out: './drizzle',
  ...(isDev && {
    dbCredentials: {
      url: process.env.DATABASE_URL as string,
    },
  }),
});
