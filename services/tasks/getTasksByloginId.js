import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {API_URL} from "@env";
    export default async function getTasksByloginId() {
        try{
            const token = await AsyncStorage.getItem("token");
            if(!token){
                throw new Error("No token found");
            }
            const response = await axios.get(`${API_URL}/task`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                }
            })
            return response.data;
        } catch (error) {
            console.error("Error fetching tasks:", error.response?.data || error.message);
            throw error;
        }   
    }