import axios from 'axios';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' ? '/api/v1' : 'http://localhost:5050/api/v1');

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// Attach token to all requests
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally (only for protected routes, not for auth endpoints like verify-otp)
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const isAuthRoute = err.config?.url?.includes('/auth/');
    if (err.response?.status === 401 && !isAuthRoute && typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// Auth
export const registerUser = (name: string, mobile: string, countryCode = '+91', businessName?: string) =>
  api.post('/auth/register', { name, mobile, countryCode, businessName });
export const sendOtp = (mobile: string, countryCode = '+91') =>
  api.post('/auth/send-otp', { mobile, countryCode });
export const verifyOtp = (mobile: string, otp: string, sessionId: string, countryCode = '+91') =>
  api.post('/auth/verify-otp', { mobile, otp, sessionId, countryCode });
export const resendOtp = (mobile: string, sessionId: string, countryCode = '+91') =>
  api.post('/auth/resend-otp', { mobile, sessionId, countryCode });
export const refreshAccessToken = (refreshToken: string) =>
  api.post('/auth/refresh-token', { refreshToken });
export const getMe = () => api.get('/auth/me');
export const updateProfile = (name: string, businessName?: string) =>
  api.put('/auth/profile', { name, businessName });
export const logout = (refreshToken: string) => api.post('/auth/logout', { refreshToken });

// Employees
export const getEmployees = (params?: Record<string, string>) =>
  api.get('/employees', { params });
export const getEmployee = (id: string) => api.get(`/employees/${id}`);
export const addEmployee = (data: Record<string, unknown>) => api.post('/employees', data);
export const updateEmployee = (id: string, data: Record<string, unknown>) =>
  api.put(`/employees/${id}`, data);
export const deleteEmployee = (id: string) => api.delete(`/employees/${id}`);

// Work Entries
export const getWorkEntries = (params?: Record<string, string>) =>
  api.get('/work-entries', { params });
export const addWorkEntry = (data: Record<string, unknown>) => api.post('/work-entries', data);
export const updateWorkEntry = (id: string, data: Record<string, unknown>) =>
  api.put(`/work-entries/${id}`, data);
export const deleteWorkEntry = (id: string) => api.delete(`/work-entries/${id}`);

// Payouts
export const getPayouts = (params?: Record<string, string>) =>
  api.get('/payouts', { params });
export const addPayout = (data: Record<string, unknown>) => api.post('/payouts', data);
export const deletePayout = (id: string) => api.delete(`/payouts/${id}`);

// Dashboard & Reports
export const getDashboardSummary = (date?: string) =>
  api.get('/dashboard/summary', { params: date ? { date } : {} });
export const getDailyReport = (date: string) =>
  api.get('/reports/daily', { params: { date } });
export const getEmployeeReport = (employeeId: string, params?: Record<string, string>) =>
  api.get(`/reports/employee/${employeeId}`, { params });

// Super Admin Platform APIs
export const getPlatformStats = () => api.get('/admin/stats');
export const getAdminUsers = (params?: { search?: string; status?: string; page?: number; limit?: number }) =>
  api.get('/admin/users', { params });
export const getAdminUserDetails = (userId: string) => api.get(`/admin/users/${userId}`);
export const toggleTenantStatus = (userId: string, isActive: boolean) =>
  api.patch(`/admin/users/${userId}/status`, { isActive });

export default api;
