const fs = require('fs');
const file = 'c:/Users/User/Desktop/admin/admin/client/src/components/CustomerDashboardEnhanced.js';
let content = fs.readFileSync(file, 'utf8');

const target = "<button onClick={() => setShowGuideModal(true)} style={{ padding: '10px 20px'";
const replacement = `<button onClick={() => setShowAgreementManagement(true)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>📋 Management</button>\n          <button onClick={() => setShowGuideModal(true)} style={{ padding: '10px 20px'`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Successfully reinserted the Agreement Management button!");
} else {
    console.log("Target string not found!");
}
