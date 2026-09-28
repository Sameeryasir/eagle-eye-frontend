import { apiPost, ApiRoutes } from '../api/client';

export const sendOtp = async (emailOrPhone) => {
  const requestBody = emailOrPhone.includes('@')
    ? { email: emailOrPhone }
    : { phone: emailOrPhone };

  return apiPost(ApiRoutes.auth.sendOtp, requestBody, { auth: false });
};

export default sendOtp;
