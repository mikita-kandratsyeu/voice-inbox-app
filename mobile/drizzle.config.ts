import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const isDev = process.env.NODE_ENV !== 'production';

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
