import { API_URL } from '@env';

export async function sendOtp(emailOrPhone) {
  try {
    // Determine if the input is an email or phone number
    // Check if the input is numeric (phone) or contains characters (email)
    const isNumeric = /^\d+$/.test(emailOrPhone);
    const requestBody = isNumeric 
      ? { phone: emailOrPhone }
      : { email: emailOrPhone };

    const response = await fetch(`${API_URL}/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to send OTP');
    }
    return data;
  } catch (error) {
    throw error;
  }
}