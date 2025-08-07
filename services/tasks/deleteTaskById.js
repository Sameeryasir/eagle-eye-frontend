import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {API_URL} from "@env"

export async function deleteTaskById(taskId) {
       try {
        const token = await AsyncStorage.getItem('token');
        if (!token) {
            throw new Error('No token found');
        }
        
        const response = await axios.delete(`${API_URL}/task/${taskId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        return response.data;
    } catch (error) {
        console.error('Error deleting task:', error);
        throw error;
    }
    
}