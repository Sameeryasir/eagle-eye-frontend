import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";
import refreshToken from "../utils/tokenRefresh";

export async function updateImageById(imageId, updateData, newFile = null) {
  const token = await AsyncStorage.getItem("token");
  const refreshTokenValue = await AsyncStorage.getItem("refreshToken");

  if (!token) {
    throw new Error("No token found");
  }

  try {
    console.log(`UpdateImageById Service - Making request to: ${API_URL}/image/${imageId}`);
    console.log(`UpdateImageById Service - Update data:`, updateData);
    console.log(`UpdateImageById Service - Request method: PUT`);
    // Check if updateData is FormData or JSON
    const isFormData = updateData instanceof FormData;
    
    const headers = {
      Authorization: `Bearer ${token}`,
    };
    
    // Set appropriate Content-Type
    if (isFormData) {
      headers['Content-Type'] = 'multipart/form-data';
    } else {
      headers['Content-Type'] = 'application/json';
    }
    
    console.log(`UpdateImageById Service - Headers:`, headers);
    
    const response = await axios.put(`${API_URL}/image/${imageId}`, updateData, {
      headers: headers,
    });
    
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      // refresh and retry once
      const newToken = await refreshToken(refreshTokenValue);
      const retryHeaders = {
        Authorization: `Bearer ${newToken}`,
      };
      
      // Set appropriate Content-Type for retry
      if (updateData instanceof FormData) {
        retryHeaders['Content-Type'] = 'multipart/form-data';
      } else {
        retryHeaders['Content-Type'] = 'application/json';
      }
      
      const retryResponse = await axios.put(`${API_URL}/image/${imageId}`, updateData, {
        headers: retryHeaders,
      });
      return retryResponse.data;
    }
    throw new Error(err.response?.data?.message || err.message || "Update failed");
  }
}