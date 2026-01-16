import axios from 'axios';

// Use relative path for local dev (proxied by Vite), or env var for production
const API_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
});

// Add request interceptor to include telegramId in headers for dev mode
apiClient.interceptors.request.use((config) => {
  // Get user from localStorage
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user.telegramId) {
        // Add telegramId to headers for dev auth
        config.headers['x-telegram-id'] = user.telegramId.toString();
      }
    } catch (error) {
      // Ignore parsing errors
    }
  }
  return config;
});

export default apiClient;
