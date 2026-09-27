/**
 * Change Summary:
 * - What: Shared axios client with Authorization + 401 token refresh retry
 * - Why: 50+ services duplicated the same refresh pattern (reuse)
 * MCP Context 7: single HTTP helper for Nest API calls
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../../config/api';
import refreshToken from '../utils/tokenRefresh';

export { API_URL };
export { ApiRoutes } from './routes';

/**
 * Authenticated request against Nest API.
 * @param {'get'|'post'|'put'|'patch'|'delete'} method
 * @param {string} path - path from ApiRoutes (starts with /)
 * @param {object} [options]
 * @param {any} [options.data] - body
 * @param {object} [options.headers] - extra headers
 * @param {boolean} [options.auth=true] - attach Bearer token
 * @param {number} [options.timeout]
 */
export async function apiRequest(method, path, options = {}) {
  const {
    data,
    headers = {},
    auth = true,
    timeout = 30000,
  } = options;

  const url = path.startsWith('http') ? path : `${API_URL}${path}`;

  const buildConfig = async (token) => {
    const cfg = {
      method,
      url,
      timeout,
      headers: { ...headers },
    };
    if (data !== undefined) {
      cfg.data = data;
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
    const response = await axios(await buildConfig(token));
    return response.data;
  } catch (err) {
    if (
      auth &&
      axios.isAxiosError(err) &&
      err.response?.status === 401 &&
      refreshTokenValue
    ) {
      const newToken = await refreshToken(refreshTokenValue);
      const response = await axios(await buildConfig(newToken));
      return response.data;
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
