const fs = require('fs');

const path = 'c:/Users/User/Desktop/admin/admin/client/src/components/UserSettingsEnhanced.js';
let content = fs.readFileSync(path, 'utf8');

const targetRegex = /<\/div>\s*<\/div>\s*<button className="reset-btn" onClick=\{handleResetTheme\}>/s;

const newString = `</div>
      
      <div className="settings-container">
        <div className="settings-tabs-horizontal">
          <button className={\`tab-btn \${activeTab === 'theme' ? 'active' : ''}\`} onClick={() => setActiveTab('theme')}>🎨 Theme</button>
          <button className={\`tab-btn \${activeTab === 'notifications' ? 'active' : ''}\`} onClick={() => setActiveTab('notifications')}>🔔 Notifications</button>
          <button className={\`tab-btn \${activeTab === 'security' ? 'active' : ''}\`} onClick={() => setActiveTab('security')}>🛡️ Security</button>
          <button className={\`tab-btn \${activeTab === 'two-factor' ? 'active' : ''}\`} onClick={() => setActiveTab('two-factor')}>🔐 2FA</button>
          <button className={\`tab-btn \${activeTab === 'profile' ? 'active' : ''}\`} onClick={() => setActiveTab('profile')}>👤 Profile</button>
          <button className={\`tab-btn \${activeTab === 'activity' ? 'active' : ''}\`} onClick={() => setActiveTab('activity')}>📋 Activity</button>
          <button className={\`tab-btn \${activeTab === 'sessions' ? 'active' : ''}\`} onClick={() => setActiveTab('sessions')}>💻 Sessions</button>
          {(user.role === 'system_admin' || user.role === 'property_admin') && (
            <button className={\`tab-btn \${activeTab === 'system' ? 'active' : ''}\`} onClick={() => setActiveTab('system')}>⚙️ System</button>
          )}
        </div>
        
        <div className="settings-content">
          {/* Theme Tab */}
          {activeTab === 'theme' && (
            <div className="tab-content">
              <h2>🎨 Theme Preferences</h2>
              <div className="settings-grid-horizontal">
                <button className="reset-btn" onClick={handleResetTheme}>`;

content = content.replace(targetRegex, newString);

fs.writeFileSync(path, content, 'utf8');
console.log("Syntax error fixed by restoring tab bar!");
