import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  FILMWEB_EMAIL: z.string().min(1),
  FILMWEB_PASSWORD: z.string().min(1),
  FILMWEB_USER_ID: z.string().min(1),
  DB_PATH: z.string().default("./data/filmweb.db"),
  STORAGE_STATE_PATH: z.string().default("./data/storageState.json"),
});

export const env = envSchema.parse(process.env);
