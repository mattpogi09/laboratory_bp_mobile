import axios from 'axios';

// YOUR LOCAL IP ADDRESS
const API_URL = 'http://192.168.1.52:8000/api'; 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

export default api;