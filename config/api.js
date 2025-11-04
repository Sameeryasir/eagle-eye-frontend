// API Configuration
// This file handles API URL configuration for different environments

// EXPO_PUBLIC_API_URL comes from eas.json environment variables
// It's injected at build time by EAS Build
const getApiUrl = () => {
  // Priority order:
  // 1. EXPO_PUBLIC_API_URL (from eas.json - for EAS builds)
  // 2. process.env.API_URL (for local development)
  // 3. Default fallback
  return process.env.EXPO_PUBLIC_API_URL || 
         process.env.API_URL || 
         'https://api.eagle-eye.ca/';
};

export const API_URL = getApiUrl();

// Debug logging - this will show you which URL is being used
console.log('=== API Configuration Debug ===');
console.log('- EXPO_PUBLIC_API_URL (from eas.json):', process.env.EXPO_PUBLIC_API_URL);
console.log('- process.env.API_URL (local):', process.env.API_URL);
console.log('- Final API_URL being used:', API_URL);
console.log('===============================');
