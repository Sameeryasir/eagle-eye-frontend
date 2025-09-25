import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { refreshToken } from '../utils/tokenRefresh';
import { API_URL } from '@env';


const deleteEventById = async (eventId) => {
  try {
    // Get the token from AsyncStorage
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Make the API request to delete the event
    const response = await axios.delete(
      `${API_URL}/event/${eventId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error deleting event:', error);
    
    // Handle token expiration
    if (error.response?.status === 401) {
      console.log('Token expired, attempting to refresh...');
      try {
        await refreshToken();
        // Retry the request with new token
        const newToken = await AsyncStorage.getItem('token');
        const retryResponse = await axios.delete(
          `${API_URL}/event/${eventId}`,
          {
            headers: {
              'Authorization': `Bearer ${newToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
        return retryResponse.data;
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        throw refreshError;
      }
    }
    
    throw error;
  }
};

export { deleteEventById };
