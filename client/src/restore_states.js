const fs = require('fs');

// 1. Fix UserSettingsEnhanced missing states
const usPath = 'c:/Users/User/Desktop/admin/admin/client/src/components/UserSettingsEnhanced.js';
let us = fs.readFileSync(usPath, 'utf8');

if (!us.includes('const [message, setMessage] = useState')) {
    us = us.replace(/const \[activeTab, setActiveTab\] = useState\('theme'\);/, 
`const [activeTab, setActiveTab] = useState('theme');
  const [message, setMessage] = useState('');
  const [show2FASetup, setShow2FASetup] = useState(false);
  const [verifying2FA, setVerifying2FA] = useState(false);`);
    fs.writeFileSync(usPath, us);
    console.log('Restored states in UserSettingsEnhanced');
}

// 2. Fix CustomerDashboardEnhanced missing state
const cdPath = 'c:/Users/User/Desktop/admin/admin/client/src/components/CustomerDashboardEnhanced.js';
let cd = fs.readFileSync(cdPath, 'utf8');

if (!cd.includes('const [showAgreementWorkflow, setShowAgreementWorkflow] = useState(false);')) {
    cd = cd.replace(/const \[showAgreementManagement, setShowAgreementManagement\] = useState\(false\);/, 
`const [showAgreementManagement, setShowAgreementManagement] = useState(false);
  const [showAgreementWorkflow, setShowAgreementWorkflow] = useState(false);`);
    fs.writeFileSync(cdPath, cd);
    console.log('Restored state in CustomerDashboardEnhanced');
}
