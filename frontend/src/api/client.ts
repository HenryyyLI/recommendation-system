import axios from 'axios';

// Mock base URL — replace with Python backend URL when ready
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://anonymous-etheline-henryli-2cb55914.koyeb.app';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export default apiClient;
