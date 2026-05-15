const getBaseUrl = () => {
  // 1. Explicit environment variable (highest priority)
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '');
  }

  // 2. Production detection
  const isProd = window.location.hostname.includes('vercel.app') || 
                 window.location.hostname.includes('onrender.com') ||
                 window.location.protocol === 'https:';
  
  if (isProd) {
    return 'https://ddrems-mongo.onrender.com';
  }

  // 3. Local development fallback
  return `http://${window.location.hostname}:5000`;
};

const BASE_URL = getBaseUrl();

export const API_URL = `${BASE_URL}/api`;
export const SOCKET_URL = BASE_URL;
export default API_URL;
