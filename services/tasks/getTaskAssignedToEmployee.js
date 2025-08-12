import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_URL} from "@env"
export async function getTaskAssignedToEmployee() {
    try {
        const token = await AsyncStorage.getItem('token'); // AsyncStorage returns a promise
        console.log('Token retrieved:', token ? 'Token exists' : 'No token');

        if (!token) {
            throw new Error('No token found');
        }

        console.log('Making API call to:', `${API_URL}/task`);
        const response = await axios.get(`${API_URL}/task`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        console.log('API response:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching tasks for employee:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        throw error;
    }
}
