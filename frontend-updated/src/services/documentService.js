import axios from "axios";

// Adjust to match how your other services call the API (base URL, auth token headers, etc.)
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const authHeaders = () => {
  const token = localStorage.getItem("token"); // adjust to your auth storage
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getFolders = async () => {
  const res = await axios.get(`${API_URL}/folders`, { headers: authHeaders() });
  return res.data;
};

export const createFolder = async (name) => {
  const res = await axios.post(
    `${API_URL}/folders`,
    { name },
    { headers: authHeaders() }
  );
  return res.data;
};

export const getDocumentsByApplication = async (applicationRef) => {
  const res = await axios.get(`${API_URL}/documents/application/${applicationRef}`, {
    headers: authHeaders(),
  });
  return res.data; // { "ID Proof": [...], "Utility Bill": [...] }
};

// Every document across every folder, not scoped to one application —
// used by the admin's general Documents nav tab.
export const getAllDocuments = async () => {
  const res = await axios.get(`${API_URL}/documents`, { headers: authHeaders() });
  return res.data; // { "ID Proof": [...], "Utility Bill": [...] }
};

export const uploadDocument = async ({
  file,
  folderName,
  applicationRef,
  applicationId,
  uploaderName,
  uploaderEmail,
}) => {
  const form = new FormData();
  // append text fields BEFORE the file — required for the multer destination() logic
  form.append("folderName", folderName);
  // applicationRef is optional now — general uploads (admin Documents tab)
  // aren't tied to a job, so only send it when we actually have one.
  if (applicationRef) form.append("applicationRef", applicationRef);
  if (applicationId) form.append("applicationId", applicationId);
  if (uploaderName) form.append("uploaderName", uploaderName);
  if (uploaderEmail) form.append("uploaderEmail", uploaderEmail);
  form.append("file", file);

  const res = await axios.post(`${API_URL}/documents/upload`, form, {
    headers: { ...authHeaders(), "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const downloadDocumentUrl = (documentId) => `${API_URL}/documents/${documentId}/download`;

export const deleteDocument = async (documentId) => {
  const res = await axios.delete(`${API_URL}/documents/${documentId}`, {
    headers: authHeaders(),
  });
  return res.data;
};

// Backend blocks this (400) if the folder still has documents in it — see
// folderController.deleteFolder.
export const deleteFolder = async (folderId) => {
  const res = await axios.delete(`${API_URL}/folders/${folderId}`, {
    headers: authHeaders(),
  });
  return res.data;
};