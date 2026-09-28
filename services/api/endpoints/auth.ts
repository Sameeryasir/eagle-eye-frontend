import { apiPost } from '../client';
import { ApiRoutes } from '../routes';
import type {
  AuthTokensResponse,
  RegisterCompanyPayload,
  SendInvitationPayload,
  SendOtpRequest,
  VerifyOtpRequest,
} from '../models';

export const authApi = {
  sendOtp: (emailOrPhone: string): Promise<unknown> => {
    const requestBody: SendOtpRequest = emailOrPhone.includes('@')
      ? { email: emailOrPhone }
      : { phone: emailOrPhone };
    return apiPost(ApiRoutes.auth.sendOtp, requestBody, { auth: false });
  },

  verifyOtp: (
    emailOrPhone: string,
    code: string
  ): Promise<AuthTokensResponse> => {
    const requestBody: VerifyOtpRequest = {
      code,
      ...(emailOrPhone.includes('@')
        ? { email: emailOrPhone }
        : { phone: emailOrPhone }),
    };
    return apiPost<AuthTokensResponse, VerifyOtpRequest>(
      ApiRoutes.auth.verifyOtp,
      requestBody,
      { auth: false }
    );
  },

  registerCompany: (payload: RegisterCompanyPayload): Promise<unknown> =>
    apiPost(ApiRoutes.auth.register, payload, { auth: false }),

  sendInvite: (email: string, projectId?: string | number): Promise<unknown> => {
    const payload: SendInvitationPayload = { email, projectId };
    return apiPost(ApiRoutes.auth.sendInvitation, payload);
  },
};

export const sendOtp = authApi.sendOtp;
export const verifyOtp = authApi.verifyOtp;
export const registerCompany = authApi.registerCompany;
export const sendInvite = authApi.sendInvite;

export default sendOtp;
