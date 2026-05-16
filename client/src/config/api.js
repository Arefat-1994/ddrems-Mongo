const getBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '');
  }
  return 'https://ddrems-mongo.onrender.com';
};

const BASE_URL = getBaseUrl();

export const API_URL = `${BASE_URL}/api`;
export const SOCKET_URL = BASE_URL;
export default API_URL;
