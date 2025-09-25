import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "@env";
import refreshToken from "../utils/tokenRefresh";

export async function uploadImage(formData) {
  const token = await AsyncStorage.getItem("token");
  const refreshTokenValue = await AsyncStorage.getItem("refreshToken");

  if (!token) {
    throw new Error("No token found");
  }

  try {
    console.log(`UploadImage Service - Making request to: ${API_URL}/image/upload`);
    console.log(`UploadImage Service - FormData parts:`, formData._parts);
    console.log(`UploadImage Service - Field names:`, formData._parts?.map(part => part[0]));
    
    const response = await axios.post(`${API_URL}/image/upload`, formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      // refresh and retry once
      const newToken = await refreshToken(refreshTokenValue);
      const retryResponse = await axios.post(`${API_URL}/image/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${newToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      return retryResponse.data;
    }
    throw new Error(err.response?.data?.message || err.message || "Upload failed");
  }
}
