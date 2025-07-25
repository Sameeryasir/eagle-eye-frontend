import { API_URL } from '@env';

export async function verifyOtp(emailOrPhone, code) {
  try {
    // Determine if the input is an email or phone number
    // Check if the input is numeric (phone) or contains characters (email)
    const isNumeric = /^\d+$/.test(emailOrPhone);
    const requestBody = isNumeric 
      ? { phone: emailOrPhone, code }
      : { email: emailOrPhone, code };

    const response = await fetch(`${API_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to verify OTP');
    }
    return data;
  } catch (error) {
    throw error;
  }
}
