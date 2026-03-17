const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const normalizeApiBaseUrl = (url: string) => url.replace(/\/+$/, '');

export const API_BASE_URL = normalizeApiBaseUrl(rawApiBaseUrl);

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};