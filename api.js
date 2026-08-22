import axios from "axios";

// All requests go through the Vite dev proxy at /api -> http://localhost:5000
const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("dayflow_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiErrorMessage(err) {
  return err?.response?.data?.error || "Something went wrong. Please try again.";
}

export default api;
