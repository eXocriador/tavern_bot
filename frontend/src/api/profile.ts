import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

export interface Profile {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  characterName?: string;
  createdAt: string;
}

export const getProfile = async (): Promise<Profile> => {
  const response = await axios.get(`${API_URL}/profile`);
  return response.data;
};

export const updateProfile = async (characterName: string): Promise<Profile> => {
  const response = await axios.put(`${API_URL}/profile`, { characterName });
  return response.data;
};

