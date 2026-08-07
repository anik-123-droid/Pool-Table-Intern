import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.PROD ? '/api' : 'http://localhost:8080/api',
  withCredentials: true, // Important for cookies
});

export default api;
