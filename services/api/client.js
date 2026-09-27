import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api';
import refreshToken from '../utils/tokenRefresh';

export { API_URL };
export { ApiRoutes } from './routes';

export async function apiRequest(method, path, options = {}) {
  const {
    data,
    headers = {},
    auth = true,
    timeout = 30000,
    signal,
  } = options;

  const url = path.startsWith('http') ? path : `${API_URL}${path}`;
  const isFormData =
    !!data &&
    (typeof FormData !== 'undefined' && data instanceof FormData ||
      data?.constructor?.name === 'FormData' ||
      (typeof data.append === 'function' && typeof data.getParts === 'function'));

  const buildConfig = (token) => {
    const cfg = {
      method,
      url,
      timeout,
      headers: {
        ...headers,
        ...(API_URL.includes('ngrok')
          ? { 'ngrok-skip-browser-warning': 'true' }
          : {}),
      },
    };
    if (signal) {
      cfg.signal = signal;
    }
    if (data !== undefined) {
      cfg.data = data;
    }
    if (isFormData) {
      delete cfg.headers['Content-Type'];
      cfg.transformRequest = [(payload) => payload];
    } else if (cfg.headers['Content-Type'] === undefined && data !== undefined) {
      cfg.headers['Content-Type'] = 'application/json';
    }
    if (auth && token) {
      cfg.headers.Authorization = `Bearer ${token}`;
    }
    return cfg;
  };

  let token = null;
  let refreshTokenValue = null;
  if (auth) {
    token = await AsyncStorage.getItem('token');
    refreshTokenValue = await AsyncStorage.getItem('refreshToken');
  }

  try {
    const response = await axios(buildConfig(token));
    return response.data;
  } catch (err) {
    if (
      auth &&
      axios.isAxiosError(err) &&
      err.response?.status === 401 &&
      refreshTokenValue
    ) {
      const newToken = await refreshToken(refreshTokenValue);
      const response = await axios(buildConfig(newToken));
      return response.data;
    }
    if (axios.isAxiosError(err) && !err.response) {
      console.error('Network request failed:', {
        method,
        url,
        message: err.message,
        apiBase: API_URL,
      });
    }
    throw err;
  }
}

export const apiGet = (path, options) => apiRequest('get', path, options);
export const apiPost = (path, data, options = {}) =>
  apiRequest('post', path, { ...options, data });
export const apiPut = (path, data, options = {}) =>
  apiRequest('put', path, { ...options, data });
export const apiDelete = (path, options) =>
  apiRequest('delete', path, options);
