const DEFAULT_API = 'http://192.168.1.2:3000';

const getApiUrl = (): string => {
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

export const API_URL: string = getApiUrl();

