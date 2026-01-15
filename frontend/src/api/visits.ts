import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface Visit {
  _id: string;
  userId: string;
  zoneId: {
    _id: string;
    zoneId: string;
    name: string;
    bossName?: string;
    level?: number;
  };
  visitedAt: string;
  periodId: string;
}

export const getMyVisits = async (): Promise<Visit[]> => {
  const response = await axios.get(`${API_URL}/visits/me`);
  return response.data;
};

export const getUserVisits = async (telegramId: number): Promise<Visit[]> => {
  const response = await axios.get(`${API_URL}/visits/user/${telegramId}`);
  return response.data;
};

export const markVisit = async (zoneId: string): Promise<Visit> => {
  const response = await axios.post(`${API_URL}/visits/${zoneId}`);
  return response.data;
};

export const removeVisit = async (zoneId: string): Promise<void> => {
  await axios.delete(`${API_URL}/visits/${zoneId}`);
};

