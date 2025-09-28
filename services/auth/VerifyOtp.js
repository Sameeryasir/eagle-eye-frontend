import axios from 'axios';
import { API_URL } from '../../config/api.js';

export async function verifyOtp(emailOrPhone, code) {
  try {
    // Debug: Log the API URL being used
    console.log('Using API URL:', API_URL);
    
    // Determine if input is a phone number or email
    const isNumeric = /^\d+$/.test(emailOrPhone);
    const requestBody = isNumeric
      ? { phone: emailOrPhone, code }
      : { email: emailOrPhone, code };

    console.log('Sending request to:', `${API_URL}/auth/verify-otp`);
    console.log('Request body:', requestBody);

    const response = await axios.post(`${API_URL}/auth/verify-otp`, requestBody, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
      }
    });

    // --- Debug: Log the complete API response ---
    console.log('=== OTP Verification API Response ===');
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    console.log('Has access_token:', !!response.data?.access_token);
    console.log('Has refresh_token:', !!response.data?.refresh_token);
    console.log('Has user object:', !!response.data?.user);
    console.log('=====================================');

    return response.data;
  } catch (error) {
    console.error('Verify OTP Error:', error);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - please check your internet connection');
    }
    
    if (error.code === 'ERR_NETWORK') {
      throw new Error('Network error - please check your internet connection and API URL');
    }
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.response?.status) {
      throw new Error(`Server error: ${error.response.status}`);
    } else {
      throw new Error('Failed to verify OTP - please try again');
    }
  }
}
