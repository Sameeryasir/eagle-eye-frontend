import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {API_URL} from '@env'

export async function createProject(data) {
    try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
            throw new Error('No token found');
        }
        
        const response = await axios.post(`${API_URL}/project/create`, data, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Error creating project:', error);
        throw error;
    }
}