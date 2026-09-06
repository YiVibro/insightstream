import axios from 'axios';
import { supabase } from '@/lib/supabaseClient';
/**
 * Axios instance targeting the FastAPI backend (/api/v1).
 * The backend is not running in this environment, so callers must
 * handle failures gracefully — the UI simulates RAG responses when
 * the API is unreachable.
 */
export const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.error('Failed to attach Supabase authorization header', e);
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.code === 'ERR_NETWORK') {
      return Promise.reject(new Error('Backend service unavailable'));
    }
    return Promise.reject(error);
  }
);