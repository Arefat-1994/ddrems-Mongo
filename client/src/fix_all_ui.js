const fs = require('fs');
const path = require('path');

// ============================================================
// 1. FIX SETTINGS TABS - Make them small horizontal pills
// ============================================================
const cssPath = path.join(__dirname, 'components', 'UserSettingsEnhanced.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Replace the large card tab styles with compact pill styles
css = css.replace(
  /\/\* Horizontal Tabs as Card Buttons \*\/[\s\S]*?\.tab-btn\.active \{[^}]*\}/,
  `/* Horizontal Tabs - Compact Pills */
.settings-tabs-horizontal {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 12px 20px;
  background: transparent;
  border-bottom: 1px solid #e2e8f0;
}

.tab-btn {
  padding: 8px 14px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  color: #475569;
  transition: all 0.25s ease;
  border-radius: 20px;
  white-space: nowrap;
  text-align: center;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex: 0 0 auto;
}

.tab-btn:hover {
  background: #eef2ff;
  color: #4f46e5;
  border-color: #c7d2fe;
}

.tab-btn.active {
  background: linear-gradient(135deg, #4f46e5, #6366f1);
  color: #fff;
  border-color: transparent;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}`
);

fs.writeFileSync(cssPath, css, 'utf8');
console.log('✅ 1. Settings tabs → compact pills');

// ============================================================
// 2. FIX SETTINGS JS - Update header to match
// ============================================================
const settingsJsPath = path.join(__dirname, 'components', 'UserSettingsEnhanced.js');
let settingsJs = fs.readFileSync(settingsJsPath, 'utf8');

// Replace the large gradient header with a compact one
settingsJs = settingsJs.replace(
  /\{\/\* Compact Settings Header \*\/\}[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/m,
  `{/* Compact Settings Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        background: '#fff',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>⚙️</span>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>Settings</h1>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>Customize your experience</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '8px 20px', borderRadius: '20px', border: 'none',
            background: saving ? '#94a3b8' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
            color: '#fff', fontWeight: 600, fontSize: '13px',
            cursor: saving ? 'not-allowed' : 'pointer', transition: 'all 0.3s ease',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
          }}
        >
          {saving ? '⏳ Saving...' : '💾 Save'}
        </button>
      </div>`
);

// Also update settings-container to have proper border-radius
settingsJs = settingsJs.replace(
  /<div className="settings-container">/,
  '<div className="settings-container" style={{ borderRadius: "12px", overflow: "hidden" }}>'
);

fs.writeFileSync(settingsJsPath, settingsJs, 'utf8');
console.log('✅ 2. Settings header → compact style');

// ============================================================
// 3. FIX CUSTOMER DASHBOARD - Restore Agreement Management + Fix buttons
// ============================================================
const dashPath = path.join(__dirname, 'components', 'CustomerDashboardEnhanced.js');
let dash = fs.readFileSync(dashPath, 'utf8');

// 3a. Fix the top buttons - make them ALL in one single horizontal row with smaller sizing
// And add back Agreement Management button
const oldButtonSection = `<div style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '15px 30px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>`;
dash = dash.replace(
  oldButtonSection,
  `<div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 24px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', flexWrap: 'nowrap', overflowX: 'auto' }}>`
);

// Replace the large styled agreements button with a compact one + add back Agreement Management
dash = dash.replace(
  /<button className="btn-secondary" onClick=\{.*?setCurrentPage\('agreements'\)\}[\s\S]*?🤝 Agreements\s*<\/button>/m,
  `<button onClick={() => setCurrentPage('agreements')} style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#fff', color: '#334155', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>🤝 Agreements</button>
        <button onClick={() => setShowAgreementManagement(true)} style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#fff', color: '#334155', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>📋 Agreement Mgmt</button>`
);

// Make AI Guide and Give Feedback buttons compact too
dash = dash.replace(
  /<button className="btn-secondary" onClick=\{\(\) => setShowGuideModal\(true\)\}>\s*🤖 AI Guide\s*<\/button>/,
  `<button onClick={() => setShowGuideModal(true)} style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid #e2e8f0', background: '#fff', color: '#334155', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>🤖 AI Guide</button>`
);

dash = dash.replace(
  /<button className="btn-primary" onClick=\{\(\) => setShowFeedbackModal\(true\)\}>\s*💬 Give Feedback\s*<\/button>/,
  `<button onClick={() => setShowFeedbackModal(true)} style={{ padding: '7px 14px', borderRadius: '20px', border: '1px solid #e2e8f0', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 600, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: '0 2px 6px rgba(99,102,241,0.3)' }}>💬 Feedback</button>`
);

fs.writeFileSync(dashPath, dash, 'utf8');
console.log('✅ 3. Dashboard buttons → single horizontal row + Agreement Management restored');

// ============================================================
// 4. FIX BROKER ENGAGEMENT CSS - Show 2 per row horizontally + compact cards
// ============================================================
const engCssPath = path.join(__dirname, 'components', 'BrokerEngagement.css');
let engCss = fs.readFileSync(engCssPath, 'utf8');

// Change engagement grid to strictly 2 columns
engCss = engCss.replace(
  /\.engagement-grid \{\s*display: grid;\s*grid-template-columns:[^;]*;\s*gap:[^;]*;\s*\}/,
  `.engagement-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}`
);

// Make cards more compact horizontally
engCss = engCss.replace(
  /\.engagement-card \{\s*background:[^;]*;\s*border-radius:[^;]*;\s*border:[^;]*;\s*padding:[^;]*;\s*transition:[^;]*;\s*box-shadow:[^;]*;\s*\}/,
  `.engagement-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  padding: 16px;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
}`
);

// Make info-grid 2-col compact
engCss = engCss.replace(
  /\.eng-info-grid \{\s*display: grid;\s*grid-template-columns:[^;]*;\s*gap:[^;]*;\s*margin-bottom:[^;]*;\s*\}/,
  `.eng-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
  margin-bottom: 10px;
  font-size: 13px;
}`
);

// Compact card-actions wrapping
engCss = engCss.replace(
  /\.engagement-card .card-actions \{[^}]*\}/,
  `.engagement-card .card-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid #f1f5f9;
}`
);

// Make buttons smaller
engCss = engCss.replace(
  /\.eng-btn \{[\s\S]*?transition:[^;]*;\s*\}/,
  `.eng-btn {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  transition: all 0.15s;
}`
);

// responsive: 1 col on mobile
engCss = engCss.replace(
  /@media \(max-width: 768px\) \{[\s\S]*?\n\}/,
  `@media (max-width: 768px) {
  .engagement-grid {
    grid-template-columns: 1fr;
  }
  .eng-info-grid,
  .eng-detail-grid {
    grid-template-columns: 1fr;
  }
  .offer-comparison {
    flex-direction: column;
  }
  .eng-modal {
    max-width: 100%;
    border-radius: 12px;
  }
  .broker-selection-grid {
    grid-template-columns: 1fr 1fr;
  }
}`
);

fs.writeFileSync(engCssPath, engCss, 'utf8');
console.log('✅ 4. Broker Engagement → 2-column grid + compact cards');

// ============================================================
// 5. ADD BROKER INFO BUTTON to engagement cards
// ============================================================
const engJsPath = path.join(__dirname, 'components', 'BrokerEngagement.js');
let engJs = fs.readFileSync(engJsPath, 'utf8');

// Add showBrokerInfo state
engJs = engJs.replace(
  'const [pdfLoading, setPdfLoading] = useState(false);',
  `const [pdfLoading, setPdfLoading] = useState(false);
  const [showBrokerInfoModal, setShowBrokerInfoModal] = useState(false);
  const [brokerInfoData, setBrokerInfoData] = useState(null);`
);

// Add fetchBrokerInfo function after fetchDetails
engJs = engJs.replace(
  'const openModal = async (type, engagement) => {',
  `const fetchBrokerInfo = async (brokerId) => {
    try {
      const res = await axios.get(\`http://localhost:5000/api/users/\${brokerId}\`);
      setBrokerInfoData(res.data);
      setShowBrokerInfoModal(true);
    } catch (err) {
      console.error('Error fetching broker info:', err);
      // Fallback to basic info
      setBrokerInfoData({ id: brokerId, name: 'Broker', email: 'N/A' });
      setShowBrokerInfoModal(true);
    }
  };

  const openModal = async (type, engagement) => {`
);

// Add Broker Info button in renderActions - before Messages button
engJs = engJs.replace(
  `// Messages & Details always available
    btns.push(
      <button key="msgs" className="eng-btn eng-btn-outline" onClick={() => openModal("messages", eng)}>
        💬 Messages
      </button>,
      <button key="details" className="eng-btn eng-btn-outline" onClick={() => openModal("details", eng)}>
        👁️ Details
      </button>
    );`,
  `// Broker Info button
    if (eng.broker_id) {
      btns.push(
        <button key="broker-info" className="eng-btn eng-btn-outline" onClick={() => fetchBrokerInfo(eng.broker_id)} style={{ background: '#faf5ff', borderColor: '#e9d5ff', color: '#7c3aed' }}>
          🧑‍💼 Broker Info
        </button>
      );
    }

    // Messages & Details always available
    btns.push(
      <button key="msgs" className="eng-btn eng-btn-outline" onClick={() => openModal("messages", eng)}>
        💬 Messages
      </button>,
      <button key="details" className="eng-btn eng-btn-outline" onClick={() => openModal("details", eng)}>
        👁️ Details
      </button>
    );`
);

// Add Broker Info Modal before the main modal
// Find the closing of the main page div
const brokerInfoModal = `
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
      )}`;

// Insert before the last closing div+return
engJs = engJs.replace(
  /(\s*)\{\/\* ══ Main Modal ══ \*\/\}/,
  `${brokerInfoModal}\n\n      {/* ══ Main Modal ══ */}`
);

fs.writeFileSync(engJsPath, engJs, 'utf8');
console.log('✅ 5. Broker Info button + modal added to engagements');

// ============================================================
// 6. FIX AGREEMENTS PAGE for customers - ensure it shows data
// ============================================================
const agreementsPath = path.join(__dirname, 'components', 'Agreements.js');
let agreementsJs = fs.readFileSync(agreementsPath, 'utf8');

// The Agreements component fetches from /api/agreements/customer/{id} for users
// This should be working. Let's ensure the endpoint uses relative URL
agreementsJs = agreementsJs.replace(
  /http:\/\/localhost:5000\/api\/agreements\/customer\//g,
  '/api/agreements/customer/'
);
agreementsJs = agreementsJs.replace(
  /http:\/\/localhost:5000\/api\/agreements\/owner\//g,
  '/api/agreements/owner/'
);
agreementsJs = agreementsJs.replace(
  /http:\/\/localhost:5000\/api\/agreements(?!\/customer|\/owner)/g,
  '/api/agreements'
);
agreementsJs = agreementsJs.replace(
  /http:\/\/localhost:5000\/api\/users/g,
  '/api/users'
);
agreementsJs = agreementsJs.replace(
  /http:\/\/localhost:5000\/api\/properties/g,
  '/api/properties'
);

fs.writeFileSync(agreementsPath, agreementsJs, 'utf8');
console.log('✅ 6. Agreements page URLs normalized');

// ============================================================
// 7. Update settings-container CSS for proper styling
// ============================================================
let css2 = fs.readFileSync(cssPath, 'utf8');
css2 = css2.replace(
  /\.settings-container \{[^}]*\}/,
  `.settings-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  margin-bottom: 30px;
  border: 1px solid #e2e8f0;
}`
);
fs.writeFileSync(cssPath, css2, 'utf8');
console.log('✅ 7. Settings container CSS updated');

console.log('\n🎉 All UI fixes applied successfully!');
