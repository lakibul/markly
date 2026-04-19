// LEARN: Axios instance with interceptors.
//
// An Axios instance lets you set defaults (baseURL, headers) once.
// Interceptors run on every request/response — perfect for:
//   - Request interceptor: attach the Authorization header automatically
//   - Response interceptor: handle token refresh when a 401 occurs
//
// Token refresh flow:
//   1. API call returns 401 (access token expired)
//   2. Interceptor catches it
//   3. Calls /auth/refresh with the refresh token
//   4. Gets a new access token
//   5. Retries the original request with the new token
//   6. User never sees the error — seamless experience

import axios, { AxiosError } from "axios";

const BASE_URL = "/api";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── Request Interceptor ──────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response Interceptor (token refresh) ────────────────────────────────────
let isRefreshing = false;
let failedQueue: { resolve: (v: string) => void; reject: (e: unknown) => void }[] = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,  // pass through successful responses unchanged

  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // If 401 and we haven't already tried to refresh for this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // If another refresh is already happening, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) throw new Error("No refresh token");

        const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const newAccessToken = data.data.accessToken;

        localStorage.setItem("accessToken", newAccessToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // Refresh failed — clear tokens and redirect to login
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
