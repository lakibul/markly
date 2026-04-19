// LEARN: Centralizing environment config in one place means:
//  1. You get TypeScript types for all env vars (no more `process.env.X as string`)
//  2. App fails fast at startup if a required var is missing (fail-fast principle)
//  3. One import gives you all config — no hunting through process.env everywhere

import dotenv from "dotenv";

dotenv.config();

function requireEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

export const env = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isDev: process.env.NODE_ENV !== "production",

  databaseUrl: requireEnv("DATABASE_URL"),

  jwt: {
    accessSecret: requireEnv("JWT_ACCESS_SECRET"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshSecret: requireEnv("JWT_REFRESH_SECRET"),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? "",
    apiKey: process.env.CLOUDINARY_API_KEY ?? "",
    apiSecret: process.env.CLOUDINARY_API_SECRET ?? "",
  },

  clientUrl: process.env.CLIENT_URL ?? "http://localhost:5173",
} as const;
