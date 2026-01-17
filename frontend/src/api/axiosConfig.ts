import axios from 'axios';

// Use relative path for local dev (proxied by Vite), or env var for production
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
});

// Add request interceptor to include telegramId in headers for authentication
// This allows the backend to identify the user for protected routes
apiClient.interceptors.request.use((config) => {
  // Get user from localStorage
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user.telegramId) {
        // Add telegramId to headers for web auth middleware
        config.headers['x-telegram-id'] = user.telegramId.toString();
        console.log(`[API-CLIENT] Added x-telegram-id header: ${user.telegramId} for ${config.method?.toUpperCase()} ${config.url}`);
      }
    } catch (error) {
      console.error('[API-CLIENT] Error parsing stored user:', error);
    }
  } else {
    console.log(`[API-CLIENT] No user in localStorage for ${config.method?.toUpperCase()} ${config.url}`);
  }
  return config;
});

export default apiClient;
