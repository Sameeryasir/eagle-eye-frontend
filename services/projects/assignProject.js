import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@env';
import refreshToken from '../utils/tokenRefresh';

export async function assignProjectToEmployees(assignData) {
  const token = await AsyncStorage.getItem('token');
  const refreshTokenValue = await AsyncStorage.getItem('refreshToken');

  try {
    const response = await axios.post(
      `${API_URL}/project/assign-to-employees`,
      {
        projectIds: assignData.projectIds,
        employeeIds: assignData.employeeIds,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (err) {
    if (err.response?.status === 401 && refreshTokenValue) {
      const newToken = await refreshToken(refreshTokenValue);
      
      const retryResponse = await axios.post(
        `${API_URL}/project/assign-to-employees`,
        {
          projectIds: assignData.projectIds,
          employeeIds: assignData.employeeIds,
        },
        {
          headers: {
            Authorization: `Bearer ${newToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return retryResponse.data;
    }
    throw err;
  }
}


