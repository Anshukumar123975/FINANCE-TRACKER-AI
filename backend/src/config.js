import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT ? Number(process.env.PORT) : 4000,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  openRouterModel: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
};

if (!config.databaseUrl) {
  console.warn('[config] DATABASE_URL is not set');
}
