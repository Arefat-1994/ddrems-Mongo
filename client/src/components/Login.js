import React, { useState } from 'react';
import './Login.css';
import axios from 'axios';
import Register from './Register';

const Login = ({ onLogin }) => {
  const [showRegister, setShowRegister] = useState(false);

  if (showRegister) {
    return <Register onBackToLogin={() => setShowRegister(false)} />;
  }

  return <LoginForm onLogin={onLogin} onShowRegister={() => setShowRegister(true)} />;
};

const LoginForm = ({ onLogin, onShowRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        email,
        password
      });
      
      onLogin(response.data.token, response.data.user);
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>🏢 DDREMS</h1>
          <h2>Admin Dashboard</h2>
          <p>Dire Dawa Real Estate Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@ddrems.com"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>Demo: admin@ddrems.com / admin123</p>
          <div className="register-section">
            <p>Don't have an account?</p>
            <button 
              type="button"
              className="btn-show-register" 
              onClick={onShowRegister}
            >
              Create Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
