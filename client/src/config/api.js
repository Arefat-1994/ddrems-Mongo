// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || '${process.env.REACT_APP_API_URL || (window.location.hostname.includes('vercel.app') ? 'https://ddrems-mongo.onrender.com' : `http://${window.location.hostname}:5000`)}';

export default API_BASE_URL;
