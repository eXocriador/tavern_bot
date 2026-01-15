import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export interface InstanceZone {
  _id: string;
  zoneId: string;
  name: string;
  bossName?: string;
  level?: number;
  description?: string;
}

export const getInstances = async (): Promise<InstanceZone[]> => {
  const response = await axios.get(`${API_URL}/instances`);
  return response.data;
};

