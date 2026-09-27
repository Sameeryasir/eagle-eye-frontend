/**
 * Change Summary:
 * - What: Uses shared apiPost + ApiRoutes.auth.verifyOtp
 * - Why: Nest path is /auth/otp/verify; screen passes (emailOrPhone, code)
 * - Dependencies: services/api/client.js, screens/OtpScreen.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiPost, ApiRoutes } from '../api/client';

// --- Verify OTP ---
// Signature must match OtpScreen: verifyOtp(emailOrPhone, code)
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
