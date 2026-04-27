const fs = require('fs');

// 1. Fix BrokerEngagement JSX injection
let bePath = 'c:/Users/User/Desktop/admin/admin/client/src/components/BrokerEngagement.js';
let be = fs.readFileSync(bePath, 'utf8');

const brokerInfoJSX = `
      {/* Broker Info Modal */}
      {showBrokerInfoModal && brokerInfoData && (
        <div className="eng-modal-overlay" onClick={() => setShowBrokerInfoModal(false)}>
          <div className="eng-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="eng-modal-header">
              <h3>🧑‍💼 Broker Information</h3>
              <button className="eng-modal-close" onClick={() => setShowBrokerInfoModal(false)}>✕</button>
            </div>
            <div className="eng-modal-body" style={{ textAlign: 'center' }}>
              <div style={{
                width: '72px', height: '72px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px', fontWeight: 700, color: '#fff',
                margin: '0 auto 16px', boxShadow: '0 4px 16px rgba(99,102,241,0.3)'
              }}>
                {brokerInfoData.name?.charAt(0)?.toUpperCase() || 'B'}
              </div>
              <h3 style={{ margin: '0 0 4px', fontSize: '18px', color: '#1e293b' }}>{brokerInfoData.name || 'Broker'}</h3>
              <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#6366f1', fontWeight: 600 }}>Licensed Broker</p>
              
              <div style={{ textAlign: 'left', background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>📧 Email</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{brokerInfoData.email || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>📱 Phone</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{brokerInfoData.phone || brokerInfoData.phone_number || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>🏢 License</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{brokerInfoData.license_number || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
                  <span style={{ fontSize: '13px', color: '#64748b' }}>📍 Area</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{brokerInfoData.service_area || brokerInfoData.address || 'N/A'}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  className="eng-btn eng-btn-primary" 
                  style={{ flex: 1, justifyContent: 'center', padding: '10px' }}
                  onClick={() => {
                    setShowBrokerInfoModal(false);
                    if (selectedEngagement) openModal('send_message', selectedEngagement);
                  }}
                >
                  💬 Send Message
                </button>
                {brokerInfoData.email && (
                  <a 
                    href={\`mailto:\${brokerInfoData.email}\`}
                    className="eng-btn eng-btn-outline"
                    style={{ flex: 1, justifyContent: 'center', padding: '10px', textDecoration: 'none' }}
                  >
                    📧 Email Broker
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
`;

if (!be.includes('Broker Info Modal')) {
    be = be.replace('{/* Modal */}', brokerInfoJSX + '\n      {/* Modal */}');
    fs.writeFileSync(bePath, be, 'utf8');
    console.log('Fixed BrokerEngagement modal insertion');
}

// 2. Fix CustomerDashboardEnhanced warnings
let dashPath = 'c:/Users/User/Desktop/admin/admin/client/src/components/CustomerDashboardEnhanced.js';
let dash = fs.readFileSync(dashPath, 'utf8');

dash = dash.replace(/import AgreementWorkflow from '\.\/AgreementWorkflow';\r?\n/, '');
dash = dash.replace(/  const \[showAgreementWorkflow, setShowAgreementWorkflow\] = useState\(false\);\r?\n/, '');

fs.writeFileSync(dashPath, dash, 'utf8');
console.log('Fixed CustomerDashboardEnhanced warnings');

// 3. Fix UserSettingsEnhanced warnings
let usPath = 'c:/Users/User/Desktop/admin/admin/client/src/components/UserSettingsEnhanced.js';
let us = fs.readFileSync(usPath, 'utf8');

us = us.replace(/  const \[message, setMessage\] = useState\(''\);\r?\n/, '');
us = us.replace(/  const \[show2FASetup, setShow2FASetup\] = useState\(false\);\r?\n/, '');
us = us.replace(/  const \[verifying2FA, setVerifying2FA\] = useState\(false\);\r?\n/, '');

// Fix duplicate loginAlerts key
us = us.replace(/loginAlerts: true,\s*loginAlerts: true/, 'loginAlerts: true');

fs.writeFileSync(usPath, us, 'utf8');
console.log('Fixed UserSettingsEnhanced warnings');

