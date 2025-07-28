import axios from 'axios';
import { API_URL } from '@env';

export async function sendOtp(emailOrPhone) {
  try {
    // Debug: Log the API URL being used
    console.log('Using API URL:', API_URL);
    
    // Determine if the input is numeric (phone) or not (email)
    const isNumeric = /^\d+$/.test(emailOrPhone);
    const requestBody = isNumeric 
      ? { phone: emailOrPhone }
      : { email: emailOrPhone };

    console.log('Sending request to:', `${API_URL}/auth/send-otp`);
    console.log('Request body:', requestBody);

    const response = await axios.post(`${API_URL}/auth/send-otp`, requestBody, {
      timeout: 10000, // 10 second timeout
      headers: {
        'Content-Type': 'application/json',
      }
    });

    return response.data;
  } catch (error) {
    console.error('Send OTP Error:', error);
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout - please check your internet connection');
    }
    
    if (error.code === 'ERR_NETWORK') {
      throw new Error('Network error - please check your internet connection and API URL');
    }
    
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    } else if (error.response?.status) {
      throw new Error(`Server error: ${error.response.status}`);
    } else {
      throw new Error('Failed to send OTP - please try again');
    }
  }
}
