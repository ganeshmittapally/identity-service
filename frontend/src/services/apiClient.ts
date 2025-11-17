import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { ApiResponse } from '../types';

class ApiClient {
  private client: AxiosInstance;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig;

        if (error.response?.status === 401 && originalRequest) {
          if (this.refreshTokenPromise) {
            try {
              const token = await this.refreshTokenPromise;
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            } catch {
              localStorage.removeItem('accessToken');
              localStorage.removeItem('refreshToken');
              window.location.href = '/login';
              return Promise.reject(error);
            }
          }

          this.refreshTokenPromise = this.refreshAccessToken();

          try {
            const token = await this.refreshTokenPromise;
            originalRequest.headers.Authorization = `Bearer ${token}`;
            this.refreshTokenPromise = null;
            return this.client(originalRequest);
          } catch {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            this.refreshTokenPromise = null;
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async refreshAccessToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.client.post<ApiResponse<{ accessToken: string }>>('/v1/auth/refresh', {
      refreshToken,
    });

    if (response.data.data?.accessToken) {
      localStorage.setItem('accessToken', response.data.data.accessToken);
      return response.data.data.accessToken;
    }

    throw new Error('Failed to refresh token');
  }

  public get<T>(url: string, config?: any) {
    return this.client.get<ApiResponse<T>>(url, config);
  }

  public post<T>(url: string, data?: any, config?: any) {
    return this.client.post<ApiResponse<T>>(url, data, config);
  }

  public put<T>(url: string, data?: any, config?: any) {
    return this.client.put<ApiResponse<T>>(url, data, config);
  }

  public patch<T>(url: string, data?: any, config?: any) {
    return this.client.patch<ApiResponse<T>>(url, data, config);
  }

  public delete<T>(url: string, config?: any) {
    return this.client.delete<ApiResponse<T>>(url, config);
  }
}

export const apiClient = new ApiClient();
