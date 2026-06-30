import axios from "axios";

const axiosInstance = axios.create({
  /*
   * In development: "/api" is proxied by Vite to localhost:5000
   * In production:  VITE_API_BASE_URL points to Render backend
   *
   * import.meta.env.VITE_API_BASE_URL reads from .env file.
   * If not set (development), falls back to "/api".
   */
  baseURL: import.meta.env.VITE_API_BASE_URL
    ? `${import.meta.env.VITE_API_BASE_URL}/api`
    : "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

export default axiosInstance;