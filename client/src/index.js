import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Global API Configuration — must run before App renders
const getBaseUrl = () => {
  // In local development, use the env var or default to Render
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL.replace(/\/api\/?$/, '');
  // In production (Vercel), use same-origin — Vercel rewrites proxy /api/* to Render
  // This eliminates cross-origin requests and the Chrome "Allow/Block" popup
  if (window.location.hostname.includes('vercel.app')) return '';
  return 'https://ddrems-mongo.onrender.com';
};
window.API_BASE = getBaseUrl();
window.API_URL = `${window.API_BASE}/api`;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
