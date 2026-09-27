const DEFAULT_API = 'https://acdd-203-99-184-85.ngrok-free.app';

const getApiUrl = () => {
  const candidates = [
    process.env.EXPO_PUBLIC_API_URL,
    process.env.API_URL,
  ];

  for (const value of candidates) {
    if (!value) continue;
    const cleaned = String(value).trim().replace(/\/$/, '');
    if (!cleaned) continue;
    return cleaned;
  }

  return DEFAULT_API;
};

export const API_URL = getApiUrl();

console.log('=== API Configuration Debug ===');
console.log('- EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL);
console.log('- process.env.API_URL:', process.env.API_URL);
console.log('- Final API_URL being used:', API_URL);
console.log('===============================');
