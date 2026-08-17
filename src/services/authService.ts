import { apiClient } from './apiClient';
import { UserRole } from '../types/inspection';

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at?: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  user: UserProfile;
}

export interface RegisterPayload {
  email: string;
  username: string;
  full_name: string;
  password: string;
  role?: UserRole;
}

export const authService = {
  async login(username: string, password: string): Promise<LoginResponse> {
    const formData = new URLSearchParams();
    formData.append('username', username);
    formData.append('password', password);

    const response = await apiClient.post<LoginResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (response.data.access_token) {
      localStorage.setItem('auth_token', response.data.access_token);
    }
    return response.data;
  },

  async register(payload: RegisterPayload): Promise<UserProfile> {
    const response = await apiClient.post<UserProfile>('/auth/register', {
      email: payload.email,
      username: payload.username,
      full_name: payload.full_name,
      password: payload.password,
      role: payload.role || 'inspector',
    });
    return response.data;
  },

  async getMe(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>('/auth/me');
    return response.data;
  },

  logout(): void {
    localStorage.removeItem('auth_token');
  },

  getStoredToken(): string | null {
    return localStorage.getItem('auth_token');
  }
};
