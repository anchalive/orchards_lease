import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Warn in production if no absolute API URL was provided — common cause of 404s
if (import.meta.env.PROD && BASE_URL === '/api/v1') {
  // eslint-disable-next-line no-console
  console.warn(
    'Warning: no VITE_API_URL provided at build time. Requests to /api/v1 will be sent to the frontend origin and may 404 on static hosts (e.g. Vercel).\nSet VITE_API_URL to your API base or configure platform rewrites. See client/DEPLOYMENT.md.'
  );
}

/* ----------------------- In-memory token store --------------------- */
let accessToken: string | null = null;
let sessionId: string | null = localStorage.getItem('ol-session-id');

export const setAccessToken = (token: string | null) => {
  accessToken = token;
};
export const getAccessToken = () => accessToken;

let refreshPromise: Promise<string> | null = null;

export const refreshAccessToken = (): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true })
      .then(({ data }) => {
        const token = data.data.accessToken as string;
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

export const setSessionId = (id: string | null) => {
  sessionId = id;
  if (id) localStorage.setItem('ol-session-id', id);
  else localStorage.removeItem('ol-session-id');
};

/* --------------------------- Axios instance ------------------------ */
export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send the refresh cookie
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  if (sessionId) config.headers['x-session-id'] = sessionId;
  return config;
});

/* ------------------- Refresh-on-401 with queueing ------------------ */
let isRefreshing = false;
let queue: { resolve: (t: string) => void; reject: (e: unknown) => void }[] = [];

const flushQueue = (error: unknown, token: string | null) => {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token as string)));
  queue = [];
};

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

let onAuthFailure: (() => void) | null = null;
export const setAuthFailureHandler = (fn: () => void) => {
  onAuthFailure = fn;
};

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig;
    const status = error.response?.status;
    const url = original?.url || '';

    const isAuthEndpoint = url.includes('/auth/login') || url.includes('/auth/refresh');

    if (status === 401 && original && !original._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({
            resolve: (token) => {
              original.headers.Authorization = `Bearer ${token}`;
              resolve(api(original));
            },
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;
      try {
        const newToken = await refreshAccessToken();
        flushQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshErr) {
        flushQueue(refreshErr, null);
        setAccessToken(null);
        onAuthFailure?.();
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/** Normalize an axios error into a readable message. */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: { message: string }[] };
    if (data?.errors?.length) return data.errors.map((e) => e.message).join(', ');
    return data?.message || error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong';
};

export default api;
