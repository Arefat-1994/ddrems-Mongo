const fs = require('fs');

// 1. Remove Add New Property from Properties.js
let propPath = 'c:/Users/User/Desktop/admin/admin/client/src/components/Properties.js';
if (fs.existsSync(propPath)) {
    let content = fs.readFileSync(propPath, 'utf8');
    content = content.replace(/user\?\.role !== "user" && \(\s*<button[^\/]+<span>➕<\/span> Add New Property\s*<\/button>\s*\)/, 'false && (<button></button>)');
    fs.writeFileSync(propPath, content, 'utf8');
    console.log('Removed Add New Property from Properties.js');
}

// 1b. Remove Add New Property from BrokerMyProperties.js
let bmpPath = 'c:/Users/User/Desktop/admin/admin/client/src/components/BrokerMyProperties.js';
if (fs.existsSync(bmpPath)) {
    let content = fs.readFileSync(bmpPath, 'utf8');
    content = content.replace(/<button[^>]+>\s*<span>➕<\/span> Add New Property\s*<\/button>/g, '');
    fs.writeFileSync(bmpPath, content, 'utf8');
    console.log('Removed Add New Property from BrokerMyProperties.js');
}

// 1c. Remove Add New Property from AgentDashboardEnhanced.js
let agPath = 'c:/Users/User/Desktop/admin/admin/client/src/components/AgentDashboardEnhanced.js';
if (fs.existsSync(agPath)) {
    let content = fs.readFileSync(agPath, 'utf8');
    content = content.replace(/<button[^>]+>\s*<span>➕<\/span> Add New Property\s*<\/button>/g, '');
    fs.writeFileSync(agPath, content, 'utf8');
    console.log('Removed Add New Property from AgentDashboardEnhanced.js');
}

// 2. Fix layout in PageHeader.css
let headerCssPath = 'c:/Users/User/Desktop/admin/admin/client/src/components/PageHeader.css';
if (fs.existsSync(headerCssPath)) {
    let css = fs.readFileSync(headerCssPath, 'utf8');
    // Remove negative margins and width fix that break screen size
    css = css.replace(/margin-left: -24px;/g, 'margin-left: 0;');
    css = css.replace(/margin-right: -24px;/g, 'margin-right: 0;');
    css = css.replace(/width: calc\(100% \+ 48px\);/g, 'width: 100%;');
    fs.writeFileSync(headerCssPath, css, 'utf8');
    console.log('Fixed PageHeader.css to fit screen size avoiding overflow.');
}

// 3. Remove access key button from System Admins part (DocumentViewerAdmin.js)
let docViewerPath = 'c:/Users/User/Desktop/admin/admin/client/src/components/shared/DocumentViewerAdmin.js';
if (fs.existsSync(docViewerPath)) {
    let content = fs.readFileSync(docViewerPath, 'utf8');
    // First, pass userRole to props if it isn't
    if (!content.includes('userRole')) {
        content = content.replace(
            /const DocumentViewerAdmin = \(\{ propertyId, property, userId, onVerificationAction \}\) => \{/,
            'const DocumentViewerAdmin = ({ propertyId, property, userId, userRole, onVerificationAction }) => {'
        );
    }
    // Now wrap Regen Key, Show Key buttons to hide for system admins
    if (!content.includes('userRole !== \'system_admin\' && (')) {
        // We look for Regen Key button and wrap it
        content = content.replace(
            /<button\s+onClick=\{\(\) => handleRegenerateKey\(doc\)\}[\s\S]*?🔑 Regen Key\s*<\/button>/,
            `{userRole !== 'system_admin' && (
                      <button
                        onClick={() => handleRegenerateKey(doc)}
                        style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: '500' }}
                      >
                        🔑 Regen Key
                      </button>
                    )}`
        );
        content = content.replace(
            /<button\s+onClick=\{\(\) => setShowAccessKeyForDoc\(doc\)\}[\s\S]*? Show Key\s*<\/button>/,
            `{userRole !== 'system_admin' && (
                      <button
                        onClick={() => setShowAccessKeyForDoc(doc)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '12px', padding: '0 10px' }}
                      >
                        <span style={{ fontSize: '16px', marginBottom: '2px' }}>📋</span>
                        Show Key
                      </button>
                    )}`
        );
    }
    fs.writeFileSync(docViewerPath, content, 'utf8');
    console.log('Removed Access Key buttons for system_admin in DocumentViewerAdmin.js');
}

// Propagate userRole to DocumentViewerAdmin in SystemAdminDashboard and PropertyAdminDashboard
function addRoleProp(filePath) {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        content = content.replace(/<DocumentViewerAdmin([\s\S]*?)userId=\{user(?:(?:\?\.id)|(?:\.id))?\}/g, '<DocumentViewerAdmin$1userId={user?.id} userRole={user?.role}');
        fs.writeFileSync(filePath, content, 'utf8');
    }
}
addRoleProp('c:/Users/User/Desktop/admin/admin/client/src/components/SystemAdminDashboard.js');
addRoleProp('c:/Users/User/Desktop/admin/admin/client/src/components/PropertyAdminDashboard.js');
addRoleProp('c:/Users/User/Desktop/admin/admin/client/src/components/PropertyApproval.js');
console.log('Propagated userRole to DocumentViewerAdmin calls');

// 4. Replace send message top part for system admin
let sysAdminPath = 'c:/Users/User/Desktop/admin/admin/client/src/components/SystemAdminDashboard.js';
if (fs.existsSync(sysAdminPath)) {
    let content = fs.readFileSync(sysAdminPath, 'utf8');
    content = content.replace(
        /onClick=\{\(\) => window\.location\.href = '\/send-message'\}/,
        "onClick={() => setCurrentPage('messages')}"
    );
    fs.writeFileSync(sysAdminPath, content, 'utf8');
    console.log('Fixed send message button in SystemAdminDashboard');
}

// 5a. PropertyApproval.js: Move ImageGallery below AIPriceComparison
let paPath = 'c:/Users/User/Desktop/admin/admin/client/src/components/PropertyApproval.js';
if (fs.existsSync(paPath)) {
    let content = fs.readFileSync(paPath, 'utf8');
    
    // Extract Image Gallery block
    const imgRegex = /\{\/\* Images Section \*\/\}\s*<div className="review-section full-width">\s*<h3>📷 Property Images[\s\S]*?<ImageGallery [^\/]+\/>\s*<\/div>/;
    const imgMatch = content.match(imgRegex);
    
    if (imgMatch) {
       let imgBlock = imgMatch[0];
       // Remove it from its original place
       content = content.replace(imgBlock, '');
       
       // Insert it after AIPriceComparison
       const target = /<AIPriceComparison[^\/]+\/>\s*<\/div>\s*<\/div>/;
       const targetMatch = content.match(target);
       if(targetMatch) {
           content = content.replace(target, targetMatch[0] + '\n\n                ' + imgBlock);
           fs.writeFileSync(paPath, content, 'utf8');
           console.log('Moved Image Gallery below AIPriceComparison');
       } else {
           console.log('Failed to find AIPriceComparison target insertion point');
       }
    } else {
       console.log('Failed to find Image Gallery block');
    }
}

// 5b. PropertyAdminDashboard Quick Navigation Toolbar - Add "Pending Properties"
let padPath = 'c:/Users/User/Desktop/admin/admin/client/src/components/PropertyAdminDashboard.js';
if (fs.existsSync(padPath)) {
    let content = fs.readFileSync(padPath, 'utf8');
    if (!content.includes('⏳ Pending Approvals')) {
        content = content.replace(
            /<span style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b', marginRight: '8px' }}>Nav Tools:<\/span>/,
            `<span style={{ fontSize: '14px', fontWeight: 'bold', color: '#64748b', marginRight: '8px' }}>Nav Tools:</span>
        <button className="btn-warning" onClick={() => setCurrentView('approval')} style={{ padding: '8px 16px', fontSize: '13px' }}>
          ⏳ Pending Properties
        </button>`
        );
        fs.writeFileSync(padPath, content, 'utf8');
        console.log('Added Pending Properties to Quick Navigation');
    }
}
