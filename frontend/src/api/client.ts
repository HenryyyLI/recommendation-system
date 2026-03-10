import axios from 'axios';

// Mock base URL — replace with Python backend URL when ready
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://generous-tortoise-henry-org-78af1212.koyeb.app';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

export default apiClient;
