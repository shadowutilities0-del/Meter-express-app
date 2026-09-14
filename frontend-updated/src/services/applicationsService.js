import api from './axiosInstance';

export const fetchApplications = () => api.get('/applications');
export const fetchApplication = (ref) => api.get(`/applications/${ref}`);
export const createApplication = (data) => api.post('/applications', data);
export const patchApplication = (ref, data) => api.put(`/applications/${ref}`, data);
export const renameApplicationRef = (ref, newRef) => api.put(`/applications/${ref}/reference`, { ref: newRef });
export const removeApplication = (ref) => api.delete(`/applications/${ref}`);

export const postMessage = (ref, data) => api.post(`/applications/${ref}/messages`, data);
export const postNote = (ref, data) => api.post(`/applications/${ref}/notes`, data);
export const postDocument = (ref, data) => api.post(`/applications/${ref}/documents`, data);
export const removeDocument = (ref, docId) => api.delete(`/applications/${ref}/documents/${docId}`);

export const postRequestMoreInfo = (ref, question) =>
  api.post(`/applications/${ref}/request-info`, { question });
export const postRespondToInfoRequest = (ref, responseText, applicantName) =>
  api.post(`/applications/${ref}/respond-info`, { responseText, applicantName });
export const postClearInfoRequest = (ref) => api.post(`/applications/${ref}/clear-info`);
export const postCancelApplication = (ref) => api.post(`/applications/${ref}/cancel`);