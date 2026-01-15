import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface UserStatistics {
  currentPeriod: {
    visited: number;
    available: number;
    total: number;
    completionRate: number;
    visits: any[];
  };
  allTime: {
    totalVisits: number;
    zoneStats: any[];
    mostVisited: any[];
  };
}

export const getMyStatistics = async (): Promise<UserStatistics> => {
  const response = await axios.get(`${API_URL}/statistics/me`);
  return response.data;
};

export const getUserStatistics = async (telegramId: number): Promise<UserStatistics & { user: any }> => {
  const response = await axios.get(`${API_URL}/statistics/user/${telegramId}`);
  return response.data;
};

export const getGlobalStatistics = async () => {
  const response = await axios.get(`${API_URL}/statistics/global`);
  return response.data;
};

export const getZoneStatistics = async (zoneId: string) => {
  const response = await axios.get(`${API_URL}/statistics/zone/${zoneId}`);
  return response.data;
};

