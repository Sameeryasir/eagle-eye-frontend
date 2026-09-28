import type { User } from './user';

export interface SendOtpRequest {
  email?: string;
  phone?: string;
}

export interface VerifyOtpRequest {
  code: string;
  email?: string;
  phone?: string;
}

export interface AuthTokensResponse {
  access_token: string;
  refresh_token: string;
  user?: User | null;
  message?: string;
}

export interface RefreshTokenRequest {
  refreshToken?: string;
  refresh_token?: string;
}

export interface RegisterCompanyPayload {
  companyName: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  [key: string]: unknown;
}

export interface SendInvitationPayload {
  email: string;
  projectId?: number | string;
}

export interface AuthSessionResponse {
  valid: boolean;
  user?: User;
}
