import { apiPost, ApiRoutes } from '../api/client';

export const verifyOtp = async (emailOrPhone, code) => {
  const requestBody = {
    code,
    ...(emailOrPhone.includes('@')
      ? { email: emailOrPhone }
      : { phone: emailOrPhone }),
  };

  return apiPost(ApiRoutes.auth.verifyOtp, requestBody, { auth: false });
};

export default verifyOtp;
