import axios from 'axios';

// Relative URL: every API call goes through nginx (TLS, headers, login rate limit).
const BASE_URL = '/api';

// We store a reference to the auth context accessor here — set during app init
let getAccessToken = () => null;
let setAccessToken = () => {};
let onAuthFailure = () => {};

export function configureApi({ getToken, setToken, onFailure }) {
  getAccessToken = getToken;
  setAccessToken = setToken;
  onAuthFailure = onFailure;
}

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // Send httpOnly refresh cookie on every request
});

// Request interceptor: attach Bearer token
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Track if a refresh is already in progress to avoid loops
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

// Response interceptor: on 401, attempt token refresh once
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const response = await axios.post(
          `${BASE_URL}/auth/refresh/`,
          {},
          { withCredentials: true }
        );
        const { access } = response.data;
        setAccessToken(access);
        api.defaults.headers.common.Authorization = `Bearer ${access}`;
        processQueue(null, access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        onAuthFailure();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
