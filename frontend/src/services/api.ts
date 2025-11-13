import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle 401 responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),

  register: (email: string, password: string, tenantId: string) =>
    apiClient.post('/auth/register', { email, password, tenantId }),

  // Tenants
  getTenants: (params?: any) =>
    apiClient.get('/tenants', { params }),

  getTenant: (id: string) =>
    apiClient.get(`/tenants/${id}`),

  createTenant: (data: any) =>
    apiClient.post('/tenants', data),

  updateTenant: (id: string, data: any) =>
    apiClient.put(`/tenants/${id}`, data),

  deleteTenant: (id: string) =>
    apiClient.delete(`/tenants/${id}`),

  getTenantMetrics: (id: string) =>
    apiClient.get(`/tenants/${id}/metrics`),

  // Participants
  getParticipants: (params?: any) =>
    apiClient.get('/participants', { params }),

  getParticipant: (id: string) =>
    apiClient.get(`/participants/${id}`),

  createParticipant: (data: any) =>
    apiClient.post('/participants', data),

  updateParticipant: (id: string, data: any) =>
    apiClient.put(`/participants/${id}`, data),

  deleteParticipant: (id: string) =>
    apiClient.delete(`/participants/${id}`),

  getParticipantFunnel: (id: string) =>
    apiClient.get(`/participants/${id}/funnel`),

  advanceParticipantStage: (id: string, data: any) =>
    apiClient.post(`/participants/${id}/advance`, data),

  getStageStatistics: () =>
    apiClient.get('/participants/statistics'),

  // Funnel
  getFunnelStatistics: () =>
    apiClient.get('/funnel/statistics'),

  // Cost
  getCostReport: (params?: any) =>
    apiClient.get('/cost/report', { params }),

  getCostSummary: () =>
    apiClient.get('/cost/summary')
};

export default apiClient;
