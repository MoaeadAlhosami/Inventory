import { createContext } from 'react';
import type { AuthUser } from '../types/auth';

export interface AuthApi {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthApi | null>(null);
