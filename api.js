import axios from "axios";

// All requests go through the Vite dev proxy at /api -> http://localhost:5000
const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("dayflow_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function apiErrorMessage(err) {
  // Server responded with an error (validation, auth, etc.) — show its message.
  if (err?.response?.data?.error) {
    return err.response.data.error;
  }
  // Request was sent but no response ever came back — backend is down, wrong
  // port, or not started yet. This is the most common cause of a blank/odd
  // error on the signup or login screen.
  if (err?.request) {
    return "Can't reach the server. Make sure the backend is running — open a terminal, run `cd backend` then `npm run dev`, and confirm it says \"Dayflow API running at http://localhost:5000\".";
  }
  // Something failed before the request could even be sent.
  return `Something went wrong: ${err?.message || "unknown error"}. Please try again.`;
}

export default api;
