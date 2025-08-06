import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {API_URL} from "@env"
export async function getMyProjects() {
    try {
        const token = await AsyncStorage.getItem('token'); // AsyncStorage returns a promise

        if (!token) {
            throw new Error('No token found');
        }

        const response = await axios.get(`${API_URL}/project`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        return response.data;
    } catch (error) {
        console.error('Error fetching projects:', error);
        throw error;
    }
}
