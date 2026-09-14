import api from './axiosInstance';

export const fetchProfile = () => api.get('/customer/profile');
export const putProfile = (data) => api.put('/customer/profile', data);
