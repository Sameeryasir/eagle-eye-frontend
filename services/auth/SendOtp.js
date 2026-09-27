/**
 * Change Summary:
 * - What: Uses shared apiPost + ApiRoutes.auth.sendOtp
 * - Why: Nest path is /auth/otp/send; LogInScreen passes a single email/phone string
 * - Dependencies: services/api/client.js, screens/LogInScreen.js
 * MCP Context 7: shared client (no duplicated refresh)
 */
import { apiPost, ApiRoutes } from '../api/client';

// --- Send OTP ---
export const sendOtp = async (emailOrPhone) => {
  const requestBody = emailOrPhone.includes('@')
    ? { email: emailOrPhone }
    : { phone: emailOrPhone };

  return apiPost(ApiRoutes.auth.sendOtp, requestBody, { auth: false });
};

export default sendOtp;
