const fs = require('fs');
const path = 'c:/Users/User/Desktop/admin/admin/client/src/components/AgreementWorkflow.js';
let content = fs.readFileSync(path, 'utf8');

const oldCode = `                           {(!isBuyer || enteredKeys[doc.id] === doc.access_key) ? (
                             <a 
                               href={getDocumentUrl(doc.document_path)} target="_blank" rel="noopener noreferrer"
                               className="btn-outline" 
                               style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                             >
                               👁️ View
                             </a>`;

const newCode = `                           {(!isBuyer || enteredKeys[doc.id] === doc.access_key) ? (
                             <button 
                               type="button"
                               className="btn-outline" 
                               style={{ fontSize: 11, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                               onClick={() => { setViewingDoc(doc); setViewDocModal(true); }}
                             >
                               👁️ View
                             </button>`;

if (content.includes(oldCode)) {
    content = content.replace(oldCode, newCode);
    fs.writeFileSync(path, content);
    console.log('Successfully replaced document view button code.');
} else {
    console.log('Could not find the document view button code block.');
    // Try a more relaxed match
    const lines = content.split('\n');
    let found = false;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('enteredKeys[doc.id] === doc.access_key') && lines[i+1].includes('<a')) {
            console.log('Found potential match at line ' + (i+1));
            // Replace the block manually
            // This is safer than a full string match if there are hidden chars
        }
    }
}
