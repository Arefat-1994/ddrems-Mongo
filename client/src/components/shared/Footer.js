import React, { useState, useEffect } from 'react';

const Footer = ({ isMainDashboard = false }) => {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentDateTime.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = currentDateTime.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  return (
    <footer style={{
      marginTop: 'auto',
      padding: '24px 30px',
      background: '#ffffff',
      borderTop: '1px solid #e2e8f0',
      width: '100%',
      boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.05)',
      fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '20px'
      }}>
        {/* Left Section - About Us */}
        <div style={{ flex: '1', minWidth: '280px', maxWidth: '400px' }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '700', 
            color: '#1e293b', 
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '22px' }}>🏢</span> DDREMS
          </h3>
          <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
            Transforming property management with modern, secure, and user-friendly technology. Dedicated to revolutionizing the Ethiopian real estate market by providing trust, transparency, and top-tier properties.
          </p>
        </div>

        {/* Center Section - Time/Date */}
        <div style={{ 
          flex: '1', 
          minWidth: '220px', 
          textAlign: 'center',
          background: '#f8fafc',
          padding: '12px 20px',
          borderRadius: '12px',
          border: '1px solid #e2e8f0'
        }}>
          <p style={{ 
            fontSize: '12px', 
            textTransform: 'uppercase', 
            fontWeight: '600', 
            color: '#94a3b8', 
            letterSpacing: '0.05em',
            marginBottom: '6px'
          }}>
            {isMainDashboard ? 'Live System Time' : 'Current Local Time'}
          </p>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#3b82f6', fontFamily: 'monospace' }}>
            {formattedTime}
          </div>
          <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px', fontWeight: '500' }}>
            {formattedDate}
          </div>
        </div>

        {/* Right Section - Quick Links / Contact (Optional) */}
        <div style={{ flex: '1', minWidth: '250px', textAlign: 'right' }}>
          <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#1e293b', marginBottom: '10px' }}>
            Get in Touch
          </h4>
          <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>✉️ support@ddrems.com</p>
          <p style={{ fontSize: '13px', color: '#64748b' }}>📞 +251 911 234 567</p>
        </div>
      </div>

      <div style={{
        marginTop: '24px',
        paddingTop: '16px',
        borderTop: '1px solid #f1f5f9',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px'
      }}>
        <p style={{ fontSize: '13px', color: '#94a3b8', fontWeight: '500' }}>
          &copy; {currentDateTime.getFullYear()} Dire Dawa Real Estate Management System. All rights reserved.
        </p>
        <p style={{ fontSize: '11px', color: '#cbd5e1' }}>
          Powered by Advanced Agentic Solutions
        </p>
      </div>
    </footer>
  );
};

export default Footer;
