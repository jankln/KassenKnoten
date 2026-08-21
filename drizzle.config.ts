import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? "./data/kassenknoten.db",
  },
  strict: true,
  verbose: true,
});
