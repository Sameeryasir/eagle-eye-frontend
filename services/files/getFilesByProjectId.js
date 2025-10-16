import axios from "axios";      
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../config/api";
import refreshToken from "../utils/tokenRefresh";

export async function getFilesByProjectId(projectId) {
    let token = await AsyncStorage.getItem("token");
    let refreshTokenValue = await AsyncStorage.getItem("refreshToken");

    if (!token) {
        throw new Error("No token Found");
    }
    
    try {
        const response = await axios.get(`${API_URL}/project-files/${projectId}`, {   
            headers: { Authorization: `Bearer ${token}` },
        });
        return response.data;
    } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
            const newToken = await refreshToken(refreshTokenValue);
            const retryResponse = await axios.get(`${API_URL}/project-files/${projectId}`, {
                headers: { Authorization: `Bearer ${newToken}` },
            });
            return retryResponse.data;
        }
        throw err;
    }
}       