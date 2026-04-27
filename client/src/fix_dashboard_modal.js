const fs = require('fs');
const path = require('path');

const dashPath = path.join(__dirname, 'components', 'CustomerDashboardEnhanced.js');
let content = fs.readFileSync(dashPath, 'utf8');

// 1. Re-add the AgreementManagement Modal JSX right before the closing div
const modalJSX = `
      {/* Agreement Management Modal */}
      {showAgreementManagement && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex',
          justifyContent: 'center', alignItems: 'center', padding: '20px'
        }}>
          <div style={{ background: '#f8fafc', borderRadius: '16px', width: '95%', maxWidth: '1400px', height: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }}>
            <button onClick={() => setShowAgreementManagement(false)} style={{ position: 'absolute', top: 20, right: 20, background: '#e2e8f0', color: '#475569', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 10, transition: 'all 0.2s' }} onMouseOver={(e) => { e.currentTarget.style.background = '#cbd5e1'; e.currentTarget.style.transform = 'scale(1.1)'; }} onMouseOut={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.transform = 'scale(1)'; }}>✕</button>
            <AgreementManagement user={user} />
          </div>
        </div>
      )}`;

if (!content.includes('Agreement Management Modal')) {
  content = content.replace(
    /\{\/\* Property 3D Viewer Modal \*\/\}/,
    `${modalJSX}\n      {/* Property 3D Viewer Modal */}`
  );
}

// 2. Adjust styling for horizontal buttons to match exact visual request
const oldButtons = `<div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'nowrap', overflowX: 'auto' }}>
        <MessageNotificationWidget 
          userId={user?.id}
          onNavigateToMessages={() => setCurrentPage('messages')}
        />
        <button onClick={() => setCurrentPage('agreements')} style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#fff', color: '#334155', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>🤝 Agreements</button>
        <button onClick={() => setShowAgreementManagement(true)} style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#fff', color: '#334155', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>📋 Agreement Mgmt</button>
        <button onClick={() => setShowGuideModal(true)} style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#fff', color: '#334155', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>🤖 AI Guide</button>
        <button onClick={() => setShowFeedbackModal(true)} style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(99,102,241,0.3)' }}>💬 Feedback</button>
      </div>`;

const newButtons = `<div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '16px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', flexWrap: 'nowrap', overflowX: 'auto', marginBottom: '20px' }}>
        <MessageNotificationWidget 
          userId={user?.id}
          onNavigateToMessages={() => setCurrentPage('messages')}
        />
        <button onClick={() => setCurrentPage('agreements')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>🤝 Agreements</button>
        <button onClick={() => setShowAgreementManagement(true)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9', color: '#334155', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>📋 Agreement Mgmt</button>
        <button onClick={() => setShowGuideModal(true)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>🤖 AI Guide</button>
        <button onClick={() => setShowFeedbackModal(true)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>💬 Give Feedback</button>
      </div>`;

content = content.replace(oldButtons, newButtons);

// 3. Make sure the message widget itself is also styled horizontally natively (it probably already is, but just in case)
fs.writeFileSync(dashPath, content, 'utf8');
console.log('Done CustomerDashboard UI update');
