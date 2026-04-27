const fs = require('fs');

const dashPath = 'c:/Users/User/Desktop/admin/admin/client/src/components/CustomerDashboardEnhanced.js';
let content = fs.readFileSync(dashPath, 'utf8');

// The block to replace
const oldBlockStart = "<div style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '10px 24px', background: '#f8fafc'";
const oldBlockRegex = /<div style=\{\{\s*display:\s*'flex',\s*gap:\s*'8px',\s*alignItems:\s*'center',\s*padding:\s*'10px 24px'.*?<\/div>/s;

const newBlock = `<div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '16px 24px', background: '#fff', borderBottom: '1px solid #e2e8f0', flexWrap: 'nowrap', overflowX: 'auto', marginBottom: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginLeft: '10px', marginRight: '10px' }}>
        <MessageNotificationWidget 
          userId={user?.id}
          onNavigateToMessages={() => setCurrentPage('messages')}
        />
        <button onClick={() => setCurrentPage('agreements')} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}>🤝 Agreements</button>
        <button onClick={() => setShowGuideModal(true)} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>🤖 AI Guide</button>
        <button onClick={() => setShowFeedbackModal(true)} style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontWeight: 600, fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(59,130,246,0.3)' }}>💬 Give Feedback</button>
      </div>`;

if (oldBlockRegex.test(content)) {
    content = content.replace(oldBlockRegex, newBlock);
    fs.writeFileSync(dashPath, content, 'utf8');
    console.log('Successfully replaced buttons block.');
} else {
    console.log('Could not find the block to replace.');
}
