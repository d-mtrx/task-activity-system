import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Railway injects DATABASE_URL; Docker uses individual vars
const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // required by Railway's Postgres
    }
  : {
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number(process.env.POSTGRES_PORT) || 5432,
      database: process.env.POSTGRES_DB || 'task_system',
      user: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
    };

export const db = new Pool({
  ...poolConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export async function connectDB(): Promise<void> {
  const client = await db.connect();
  console.log('✅ PostgreSQL connected');
  client.release();
}
