import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { refreshToken } from '../utils/tokenRefresh';
import { API_URL } from '@env';


const updateEventById = async (eventId, eventData) => {
  try {
    // Get the token from AsyncStorage
    const token = await AsyncStorage.getItem('token');
    
    if (!token) {
      throw new Error('No authentication token found');
    }

    // Make the API request to update the event
    const response = await axios.put(
      `${API_URL}/event/${eventId}`,
      eventData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error updating event:', error);
    
    // Handle token expiration
    if (error.response?.status === 401) {
      console.log('Token expired, attempting to refresh...');
      try {
        await refreshToken();
        // Retry the request with new token
        const newToken = await AsyncStorage.getItem('token');
        const retryResponse = await axios.put(
          `${API_URL}/event/${eventId}`,
          eventData,
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
    
    // --- ENHANCED ERROR HANDLING: Extract API response message for better user feedback ---
    // Business Rule: Show specific API error messages to users for better UX
    // This ensures users see the exact validation error from the backend
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    } else if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    } else if (error.message) {
      throw new Error(error.message);
    } else {
      throw new Error("Failed to update event");
    }
  }
};

export { updateEventById };
