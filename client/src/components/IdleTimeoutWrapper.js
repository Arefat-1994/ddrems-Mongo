import React, { useState, useEffect, useCallback, useRef } from 'react';

/**
 * IdleTimeoutWrapper - Detects user inactivity and auto-logs them out.
 * Exempt roles: system_admin, property_admin
 * Default timeout: 5 minutes
 * User-configurable: 5, 10, 20, 30, 60 minutes
 */
const IdleTimeoutWrapper = ({ user, onLogout, children }) => {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [idleTimeout, setIdleTimeout] = useState(5); // minutes
  const idleTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Exempt roles don't get timed out
  const isExempt = ['system_admin', 'property_admin'].includes(user?.role);

  // Fetch user's idle timeout preference
  useEffect(() => {
    if (isExempt || !user?.id) return;

    const fetchTimeout = async () => {
      try {
        const res = await fetch(`http://${window.location.hostname}:5000/api/user-settings/${user.id}`);
        if (res.ok) {
          const data = await res.json();
          const timeout = data.idle_timeout || data.idleTimeout || 5;
          setIdleTimeout(timeout);
        }
      } catch (err) {
        console.error('Error fetching idle timeout:', err);
      }
    };
    fetchTimeout();
  }, [user?.id, isExempt]);

  const clearAllTimers = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
  }, []);

  const handleLogout = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    onLogout();
  }, [clearAllTimers, onLogout]);

  const resetIdleTimer = useCallback(() => {
    if (isExempt) return;
    clearAllTimers();
    setShowWarning(false);
    setCountdown(60);

    // Set idle timer: show warning 60 seconds before timeout
    const warningTime = Math.max((idleTimeout * 60 - 60) * 1000, 30000); // At least 30s before warning
    idleTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(60);

      // Start countdown
      let remaining = 60;
      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(countdownIntervalRef.current);
          handleLogout();
        }
      }, 1000);
    }, warningTime);
  }, [isExempt, idleTimeout, clearAllTimers, handleLogout]);

  // Set up activity listeners
  useEffect(() => {
    if (isExempt) return;

    const activityEvents = [
      'mousedown', 'mousemove', 'keydown', 'scroll',
      'touchstart', 'click', 'wheel', 'resize'
    ];

    const handleActivity = () => {
      if (!showWarning) {
        resetIdleTimer();
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Start initial timer
    resetIdleTimer();

    return () => {
      clearAllTimers();
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExempt, idleTimeout, showWarning]);

  const handleStayLoggedIn = () => {
    clearAllTimers();
    setShowWarning(false);
    setCountdown(60);
    resetIdleTimer();
  };

  if (isExempt) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      {showWarning && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100000,
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e293b, #0f172a)',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '440px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255,255,255,0.1)',
            animation: 'slideUp 0.4s ease',
          }}>
            {/* Warning icon */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              background: countdown <= 10 ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px', fontSize: '36px',
              boxShadow: countdown <= 10 ? '0 0 30px rgba(239,68,68,0.4)' : '0 0 30px rgba(245,158,11,0.4)',
              transition: 'all 0.5s ease',
            }}>
              ⏰
            </div>

            <h2 style={{
              color: '#fff', fontSize: '22px', fontWeight: 700,
              margin: '0 0 8px',
            }}>
              Session Timeout Warning
            </h2>

            <p style={{
              color: '#94a3b8', fontSize: '14px',
              margin: '0 0 24px', lineHeight: 1.5,
            }}>
              You've been inactive for a while. Your session will expire for security reasons.
            </p>

            {/* Countdown circle */}
            <div style={{
              position: 'relative',
              width: '100px', height: '100px',
              margin: '0 auto 24px',
            }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                <circle cx="50" cy="50" r="45" fill="none"
                  stroke={countdown <= 10 ? '#ef4444' : countdown <= 30 ? '#f59e0b' : '#10b981'}
                  strokeWidth="6"
                  strokeDasharray={`${(countdown / 60) * 283} 283`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                  style={{ transition: 'stroke-dasharray 1s linear, stroke 0.5s ease' }}
                />
              </svg>
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                fontSize: '28px', fontWeight: 800,
                color: countdown <= 10 ? '#ef4444' : '#fff',
                transition: 'color 0.5s ease',
              }}>
                {countdown}
              </div>
            </div>

            <p style={{
              color: '#cbd5e1', fontSize: '13px', margin: '0 0 24px',
            }}>
              Logging out in <strong style={{ color: countdown <= 10 ? '#ef4444' : '#f59e0b' }}>{countdown} seconds</strong>
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleStayLoggedIn}
                style={{
                  padding: '12px 28px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: '#fff', fontWeight: 700, fontSize: '14px',
                  cursor: 'pointer', boxShadow: '0 4px 15px rgba(16,185,129,0.4)',
                  transition: 'transform 0.2s ease',
                }}
                onMouseOver={e => e.target.style.transform = 'scale(1.05)'}
                onMouseOut={e => e.target.style.transform = 'scale(1)'}
              >
                ✅ Stay Logged In
              </button>
              <button
                onClick={handleLogout}
                style={{
                  padding: '12px 28px', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: '#94a3b8', fontWeight: 600, fontSize: '14px',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                }}
                onMouseOver={e => { e.target.style.borderColor = '#ef4444'; e.target.style.color = '#ef4444'; }}
                onMouseOut={e => { e.target.style.borderColor = 'rgba(255,255,255,0.2)'; e.target.style.color = '#94a3b8'; }}
              >
                🚪 Logout Now
              </button>
            </div>
          </div>
        </div>
      )}

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
    </>
  );
};

export default IdleTimeoutWrapper;
