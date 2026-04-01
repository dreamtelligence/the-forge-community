import fs from "node:fs";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

const envLocalPath = new URL(".env.local", import.meta.url);
const envPath = new URL(".env", import.meta.url);

if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
}

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const url =
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.DIRECT_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL;
const shadowDatabaseUrl = process.env.SHADOW_DATABASE_URL;

if (!url) {
  throw new Error("Missing database URL for Prisma config.");
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url,
    shadowDatabaseUrl,
  },
});
