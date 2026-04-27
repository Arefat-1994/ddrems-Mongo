const fs = require('fs');

const file = 'c:/Users/User/Desktop/admin/admin/client/src/components/BrokerEngagement.js';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove the Broker Info button from the cards
const removeRegex = /\/\/ Broker Info button[\s\S]*?\/\/ Messages & Details always available/m;
content = content.replace(removeRegex, '// Messages & Details always available');

// 2. Put it in the top right next to "Hire a Broker"
const topBarRegex = /<div className="engagement-top-bar">[\s\S]*?<\/div>/m;
const newTopBar = `<div className="engagement-top-bar">
        <span style={{ color: "#64748b", fontSize: 14 }}>{engagements.length} engagement{engagements.length !== 1 ? "s" : ""}</span>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {engagements.some(e => e.broker_id) && (
            <button className="eng-btn eng-btn-outline" onClick={() => fetchBrokerInfo(engagements.find(e => e.broker_id).broker_id)} style={{ background: '#faf5ff', borderColor: '#e9d5ff', color: '#7c3aed', padding: '10px 20px', borderRadius: '10px', height: '40px', fontSize: '14px', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.15)', margin: 0, fontWeight: 600 }}>
              🧑‍💼 Broker Info
            </button>
          )}
          {isBuyer && (
            <button className="btn-hire-broker" onClick={() => openModal("hire", null)} style={{ height: '40px', margin: 0 }}>
              🤝 Hire a Broker
            </button>
          )}
        </div>
      </div>`;

content = content.replace(topBarRegex, newTopBar);

fs.writeFileSync(file, content, 'utf8');
console.log('Successfully moved the Broker Info button!');
