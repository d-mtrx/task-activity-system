import { db } from '../config/database';
import { User } from '../types';

export const UserModel = {
  async create(username: string, passwordHash: string): Promise<User> {
    const { rows } = await db.query<User>(
      `INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *`,
      [username, passwordHash]
    );
    return rows[0];
  },

  async findByUsername(username: string): Promise<User | null> {
    const { rows } = await db.query<User>(
      `SELECT * FROM users WHERE username = $1`,
      [username]
    );
    return rows[0] ?? null;
  },

  async findById(id: string): Promise<User | null> {
    const { rows } = await db.query<User>(
      `SELECT * FROM users WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  },
};
