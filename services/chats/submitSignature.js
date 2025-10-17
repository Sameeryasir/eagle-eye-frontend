import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../config/api";
import refreshToken from "../utils/tokenRefresh";

// --- Submit Signature to Backend (MCP Context 7) ---
// Business Rule: Send user's signature data to server to complete the contract
// This updates the signature status from 'pending' to 'signed'
const submitSignature = async (contractId, signatureData) => {
  const token = await AsyncStorage.getItem("token");
  const refreshTokenValue = await AsyncStorage.getItem("refreshToken");

  if (!token) {
    throw new Error("No token found");
  }

  try {
    // Prepare FormData with only the signature file
    const formData = new FormData();
    formData.append('file', {
      uri: signatureData.uri,
      type: signatureData.type || 'image/png',
      name: signatureData.fileName || 'signature.png'
    });

    console.log(`SubmitSignature Service - Making request to: ${API_URL}/signature/${contractId}/upload-file`);
    console.log(`SubmitSignature Service - FormData parts:`, formData._parts);
    console.log(`SubmitSignature Service - Field names:`, formData._parts?.map(part => part[0]));
    
    const response = await axios.post(`${API_URL}/signature/${contractId}/upload-file`, formData, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    
    console.log('✅ Signature submitted successfully:', response.data);
    return response.data;
    
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 401 && refreshTokenValue) {
      // refresh and retry once
      const newToken = await refreshToken(refreshTokenValue);
      const retryResponse = await axios.post(`${API_URL}/signature/${contractId}/upload-file`, formData, {
        headers: { 
          Authorization: `Bearer ${newToken}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      return retryResponse.data;
    }
    throw new Error(err.response?.data?.message || err.message || "Signature submission failed");
  }
};

export default submitSignature;
