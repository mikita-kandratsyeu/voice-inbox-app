import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './src/shared/lib/db/schema.ts',
  out: './drizzle',
});
