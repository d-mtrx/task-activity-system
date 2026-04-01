import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { UserModel } from '../models/user.model';
import { RegisterDTO, LoginDTO, AuthPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

export const AuthService = {
  async register(dto: RegisterDTO): Promise<{ token: string; username: string }> {
    const existing = await UserModel.findByUsername(dto.username);
    if (existing) throw new Error('Username already taken');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await UserModel.create(dto.username, passwordHash);

    const token = jwt.sign(
      { userId: user.id, username: user.username } satisfies AuthPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return { token, username: user.username };
  },

  async login(dto: LoginDTO): Promise<{ token: string; username: string }> {
    const user = await UserModel.findByUsername(dto.username);
    if (!user) throw new Error('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) throw new Error('Invalid credentials');

    const token = jwt.sign(
      { userId: user.id, username: user.username } satisfies AuthPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return { token, username: user.username };
  },

  verifyToken(token: string): AuthPayload {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  },
};
