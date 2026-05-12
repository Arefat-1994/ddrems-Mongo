/**
 * Fix all model files that have ref: 'Unknown' 
 * Replace with correct model references based on field name patterns
 */
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'models');

// Mapping of field name patterns to correct ref values
const fieldToRef = {
  'user_id': 'Users',
  'admin_id': 'Users',
  'broker_id': 'Users',
  'owner_id': 'Users',
  'customer_id': 'Users',
  'tenant_id': 'Users',
  'inspector_id': 'Users',
  'sender_id': 'Users',
  'receiver_id': 'Users',
  'recipient_id': 'Users',
  'verified_by_id': 'Users',
  'reported_by': 'Users',
  'assigned_to': 'Users',
  'created_by': 'Users',
  'updated_by': 'Users',
  'changed_by': 'Users',
  'property_id': 'Properties',
  'agreement_id': 'Agreements',
  'agreement_request_id': 'AgreementRequests',
  'transaction_id': 'Transactions',
  'message_id': 'Messages',
  'broker_engagement_id': 'BrokerEngagements',
  'booking_id': 'BrokerTemporaryBookings',
  // Generic IDs that can reference multiple collections - remove ref entirely
  'profile_id': null,
  'related_id': null,
  'entity_id': null,
  'session_id': null,
};

const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js') && f !== 'index.js');

let fixedCount = 0;

for (const file of files) {
  const filePath = path.join(modelsDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes("ref: 'Unknown'")) continue;
  
  let modified = false;
  
  for (const [field, refModel] of Object.entries(fieldToRef)) {
    // Match pattern: field_name: { type: mongoose.Schema.Types.ObjectId, ref: 'Unknown' }
    const regex = new RegExp(
      `(${field}:\\s*\\{[^}]*ref:\\s*)'Unknown'`,
      'g'
    );
    
    if (regex.test(content)) {
      if (refModel === null) {
        // Remove the ref entirely for generic IDs
        content = content.replace(regex, (match, prefix) => {
          // Remove the ref part
          return prefix.replace(/,?\s*ref:\s*$/, '').replace(/\{\s*type:/, '{ type:');
        });
        // Actually, let's just set it to a generic ObjectId without ref
        // Re-read and do simpler replacement
      } else {
        content = content.replace(regex, `$1'${refModel}'`);
      }
      modified = true;
    }
  }
  
  // Catch any remaining ref: 'Unknown' that weren't matched by field patterns
  // These are likely user-related IDs we missed
  if (content.includes("ref: 'Unknown'")) {
    // For any remaining, check if field name contains user-related keywords
    content = content.replace(
      /(\w+_(?:id|by)):\s*\{[^}]*ref:\s*'Unknown'/g,
      (match, fieldName) => {
        const userFields = ['user', 'admin', 'broker', 'owner', 'customer', 'tenant', 'inspector', 'sender', 'receiver', 'recipient', 'verified_by', 'reported_by', 'assigned', 'created_by', 'approved_by'];
        const propFields = ['property'];
        const agreementFields = ['agreement'];
        
        for (const uf of userFields) {
          if (fieldName.toLowerCase().includes(uf)) {
            return match.replace("ref: 'Unknown'", "ref: 'Users'");
          }
        }
        for (const pf of propFields) {
          if (fieldName.toLowerCase().includes(pf)) {
            return match.replace("ref: 'Unknown'", "ref: 'Properties'");
          }
        }
        for (const af of agreementFields) {
          if (fieldName.toLowerCase().includes(af)) {
            return match.replace("ref: 'Unknown'", "ref: 'Agreements'");
          }
        }
        
        // Default: remove the ref for truly unknown references
        return match.replace(", ref: 'Unknown'", '');
      }
    );
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    fixedCount++;
    console.log(`Fixed: ${file}`);
  }
}

console.log(`\nDone! Fixed ${fixedCount} model files.`);
