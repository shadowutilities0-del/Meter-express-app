import api from './axiosInstance';

export const fetchTeamMessages = () => api.get('/team-messages');
export const postTeamMessage = (data) => api.post('/team-messages', data);
