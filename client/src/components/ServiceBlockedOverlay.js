import React, { useState, useEffect } from 'react';

/**
 * ServiceBlockedOverlay - Shows when the system is closed or a service is disabled for the user's role.
 * Checks system schedule and per-role service controls.
 * Exempt roles: system_admin, property_admin
 */
const ServiceBlockedOverlay = ({ user, currentPage, onLogout }) => {
  const [systemStatus, setSystemStatus] = useState(null);
  const [disabledServices, setDisabledServices] = useState({});
  const [loading, setLoading] = useState(true);

  const isExempt = ['system_admin', 'property_admin'].includes(user?.role);

  // Map page names to service names for checking
  const pageToService = {
    'dashboard': 'dashboard',
    'properties': 'properties',
    'browse-properties': 'properties',
    'brokers': 'brokers',
    'users': 'users',
    'transactions': 'transactions',
    'announcements': 'announcements',
    'messages': 'messages',
    'send-message': 'messages',
    'commission': 'commission',
    'agreements': 'agreements',
    'documents': 'documents',

    'requests': 'requests',
    'broker-engagement': 'broker-engagement',
    'rent-payments': 'rent-payments',
    'agreement-workflow': 'agreement-workflow',
    'direct-agreements': 'agreement-workflow',
    'favorites': 'favorites',
    'bookings': 'bookings',
    'map-view': 'map-view',
    'complaints': 'complaints',
    'mpesa': 'mpesa',
    'site-check': 'site-check',
  };

  useEffect(() => {
    if (isExempt) {
      setLoading(false);
      return;
    }

    const checkStatus = async () => {
      try {
        // Check system schedule
        const scheduleRes = await fetch(`http://${window.location.hostname}:5000/api/service-control/schedule/is-open`);
        if (scheduleRes.ok) {
          const data = await scheduleRes.json();
          setSystemStatus(data);
        }

        // Check role-specific service controls
        if (user?.role) {
          const serviceRes = await fetch(`http://${window.location.hostname}:5000/api/service-control/check/${user.role}`);
          if (serviceRes.ok) {
            const data = await serviceRes.json();
            setDisabledServices(data.disabledServices || {});
          }
        }
      } catch (err) {
        console.error('Error checking service status:', err);
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
    // Re-check every 2 minutes
    const interval = setInterval(checkStatus, 120000);
    return () => clearInterval(interval);
  }, [user?.role, isExempt, currentPage]);

  if (isExempt || loading) return null;

  // Check if system is closed
  if (systemStatus && !systemStatus.is_open) {
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99999, overflow: 'hidden',
      }}>
        {/* Background particles */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.3 }}>
          {[...Array(20)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              background: '#6366f1',
              borderRadius: '50%',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }} />
          ))}
        </div>

        <div style={{
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '50px',
          maxWidth: '500px', width: '90%',
          textAlign: 'center',
          border: '1px solid rgba(99, 102, 241, 0.2)',
          boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.5s ease',
        }}>
          {/* Icon */}
          <div style={{
            width: '100px', height: '100px', borderRadius: '50%',
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', fontSize: '48px',
            boxShadow: '0 0 40px rgba(239,68,68,0.3)',
            animation: 'pulse 2s ease-in-out infinite',
          }}>
            🔒
          </div>

          <h1 style={{
            color: '#fff', fontSize: '28px', fontWeight: 800,
            margin: '0 0 12px',
            background: 'linear-gradient(135deg, #f8fafc, #cbd5e1)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            System Closed
          </h1>

          <p style={{
            color: '#94a3b8', fontSize: '16px',
            margin: '0 0 24px', lineHeight: 1.6,
          }}>
            {systemStatus.message || 'The system is currently not available. Please come back later.'}
          </p>

          {systemStatus.open_time && systemStatus.close_time && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              borderRadius: '12px', padding: '16px',
              margin: '0 0 24px',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}>
              <p style={{ color: '#a5b4fc', fontSize: '13px', margin: 0 }}>
                ⏰ Operating Hours: <strong>{systemStatus.open_time}</strong> – <strong>{systemStatus.close_time}</strong>
              </p>
            </div>
          )}

          <button
            onClick={onLogout}
            style={{
              padding: '14px 32px', borderRadius: '14px', border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              color: '#fff', fontWeight: 700, fontSize: '15px',
              cursor: 'pointer', boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
              transition: 'transform 0.2s ease',
            }}
            onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={e => e.target.style.transform = 'scale(1)'}
          >
            🚪 Return to Login
          </button>
        </div>

        <style>{`
          @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-20px); }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  // Check if current service is disabled for user's role
  const serviceName = pageToService[currentPage];
  const serviceBlock = disabledServices[serviceName] || disabledServices['all_services'];

  if (serviceBlock && serviceBlock.is_disabled) {
    const statusIcons = {
      'repair': '🔧',
      'unavailable': '🚫',
      'maintenance': '⚙️',
      'custom': '📢',
    };
    const statusColors = {
      'repair': { bg: '#f59e0b', shadow: 'rgba(245,158,11,0.3)' },
      'unavailable': { bg: '#ef4444', shadow: 'rgba(239,68,68,0.3)' },
      'maintenance': { bg: '#6366f1', shadow: 'rgba(99,102,241,0.3)' },
      'custom': { bg: '#8b5cf6', shadow: 'rgba(139,92,246,0.3)' },
    };

    const icon = statusIcons[serviceBlock.status_type] || '🚫';
    const color = statusColors[serviceBlock.status_type] || statusColors.unavailable;

    const statusLabels = {
      'repair': 'Under Repair',
      'unavailable': 'Service Unavailable',
      'maintenance': 'Under Maintenance',
      'custom': 'Service Notice',
    };

    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 99998,
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.3s ease',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #1e293b, #0f172a)',
          borderRadius: '24px',
          padding: '44px',
          maxWidth: '480px', width: '90%',
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
          animation: 'slideUp 0.4s ease',
        }}>
          {/* Status badge */}
          <div style={{
            display: 'inline-block',
            background: `${color.bg}20`,
            color: color.bg,
            borderRadius: '20px',
            padding: '6px 16px',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginBottom: '20px',
            border: `1px solid ${color.bg}40`,
          }}>
            {statusLabels[serviceBlock.status_type] || 'Unavailable'}
          </div>

          {/* Icon */}
          <div style={{
            width: '90px', height: '90px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${color.bg}, ${color.bg}cc)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', fontSize: '42px',
            boxShadow: `0 0 40px ${color.shadow}`,
          }}>
            {icon}
          </div>

          <h2 style={{
            color: '#fff', fontSize: '22px', fontWeight: 700,
            margin: '0 0 12px',
          }}>
            {statusLabels[serviceBlock.status_type] || 'Service Unavailable'}
          </h2>

          <p style={{
            color: '#94a3b8', fontSize: '15px',
            margin: '0 0 20px', lineHeight: 1.6,
          }}>
            {serviceBlock.display_message}
          </p>

          {serviceBlock.estimated_restore && (
            <div style={{
              background: 'rgba(16,185,129,0.1)',
              borderRadius: '12px', padding: '12px 16px',
              margin: '0 0 24px',
              border: '1px solid rgba(16,185,129,0.2)',
            }}>
              <p style={{ color: '#34d399', fontSize: '13px', margin: 0 }}>
                🕐 Estimated restoration: <strong>{new Date(serviceBlock.estimated_restore).toLocaleString()}</strong>
              </p>
            </div>
          )}

          <button
            onClick={() => window.history.back()}
            style={{
              padding: '12px 28px', borderRadius: '12px', border: 'none',
              background: `linear-gradient(135deg, ${color.bg}, ${color.bg}cc)`,
              color: '#fff', fontWeight: 700, fontSize: '14px',
              cursor: 'pointer', boxShadow: `0 4px 20px ${color.shadow}`,
              transition: 'transform 0.2s ease',
            }}
            onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={e => e.target.style.transform = 'scale(1)'}
          >
            ← Go Back
          </button>
        </div>

        <style>{`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  return null;
};

export default ServiceBlockedOverlay;
