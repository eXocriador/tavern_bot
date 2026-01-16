import apiClient from './axiosConfig';

export interface Profile {
  telegramId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  characterName?: string;
  createdAt: string;
}

export const getProfile = async (): Promise<Profile> => {
  const response = await apiClient.get('/profile');
  return response.data;
};

export const updateProfile = async (characterName: string): Promise<Profile> => {
  const response = await apiClient.put('/profile', { characterName });
  return response.data;
};

