export interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
