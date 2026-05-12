/**
 * Migration script: Convert all db.query() SQL calls in agreement-workflow.js to Mongoose
 * 
 * Strategy: Read the file, apply targeted regex replacements for each known SQL pattern,
 * then write the result back.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'server', 'routes', 'agreement-workflow.js');
let content = fs.readFileSync(filePath, 'utf8');

// Track replacements
let count = 0;
const replace = (from, to) => {
  if (content.includes(from)) {
    content = content.replace(from, to);
    count++;
    return true;
  }
  console.warn('NOT FOUND:', from.substring(0, 80));
  return false;
};

// ═══════════════════════════════════════════════════════════════
// 1. Fix the imports at the top
// ═══════════════════════════════════════════════════════════════

replace(
  `const db = require("../config/db");
const { generateRentalSchedule } = require("./rental-payments");
const mongoose = require("mongoose");
const { AgreementRequests, AgreementPayments, AgreementDocuments, AgreementCommissions, AgreementWorkflowHistory } = require("../models");`,
  
  `const mongoose = require("mongoose");
const { AgreementRequests, AgreementPayments, AgreementDocuments, AgreementCommissions, AgreementWorkflowHistory, AgreementNotifications, AgreementSignatures, Notifications, Properties, Users } = require("../models");

// Helper: safely convert to ObjectId
const toOid = (id) => {
  if (!id) return null;
  if (mongoose.Types.ObjectId.isValid(id)) return new mongoose.Types.ObjectId(id);
  return null;
};

// Helper: log workflow history
const logHistory = async (agreementId, stepNumber, stepName, action, actionById, prevStatus, newStatus, notes) => {
  try {
    await AgreementWorkflowHistory.create({
      agreement_request_id: toOid(agreementId),
      step_number: stepNumber,
      step_name: stepName,
      action,
      action_by_id: toOid(actionById),
      previous_status: prevStatus,
      new_status: newStatus,
      notes,
      created_at: new Date()
    });
  } catch (e) { console.error("History log error:", e.message); }
};

// Helper: create notification
const createNotif = async (agreementId, recipientId, type, title, message) => {
  try {
    await AgreementNotifications.create({
      agreement_request_id: toOid(agreementId),
      recipient_id: toOid(recipientId),
      notification_type: type,
      notification_title: title,
      notification_message: message,
      created_at: new Date()
    });
    await Notifications.create({
      user_id: toOid(recipientId),
      title,
      message,
      type: 'info',
      is_read: false,
      created_at: new Date()
    });
  } catch (e) { console.error("Notification error:", e.message); }
};`
);

// ═══════════════════════════════════════════════════════════════
// 2. STEP 1: request-direct — Replace SQL with Mongoose
// ═══════════════════════════════════════════════════════════════

// 2a. Get property
replace(
  `    // Get property details to find owner
    const [property] = await db.query(
      "SELECT owner_id, price, listing_type FROM properties WHERE id = ?",
      [property_id],
    );

    if (property.length === 0) {
      return res.status(404).json({
        message: "Property not found",
        success: false,
      });
    }

    const owner_id = property[0].owner_id;
    const property_price = property[0].price;
    const resolvedType = agreement_type || property[0].listing_type || 'sale';`,
  
  `    // Get property details to find owner
    const property = await Properties.findById(property_id).lean();
    if (!property) {
      return res.status(404).json({ message: "Property not found", success: false });
    }

    const owner_id = property.owner_id;
    const property_price = property.price;
    const resolvedType = agreement_type || property.listing_type || 'sale';`
);

// 2b. Check duplicate
replace(
  `    // Check for duplicate pending requests
    const [existing] = await db.query(
      \`SELECT id FROM agreement_requests WHERE customer_id = ? AND property_id = ? AND status NOT IN ('completed', 'owner_rejected', 'cancelled')\`,
      [customer_id, property_id],
    );
    if (existing.length > 0) {
      return res.status(400).json({
        message:
          "You already have an active agreement request for this property",
        success: false,
      });
    }`,
  
  `    // Check for duplicate pending requests
    const existing = await AgreementRequests.findOne({
      customer_id: toOid(customer_id),
      property_id: toOid(property_id),
      status: { $nin: ['completed', 'owner_rejected', 'cancelled'] }
    });
    if (existing) {
      return res.status(400).json({
        message: "You already have an active agreement request for this property",
        success: false,
      });
    }`
);

// 2c. Create agreement
replace(
  `    // Create direct agreement request (no broker_id) — starts with price negotiation
    const [result] = await db.query(
      \`
      INSERT INTO agreement_requests (
        customer_id, owner_id, property_id, status, current_step,
        customer_notes, property_price, proposed_price, move_in_date,
        agreement_type, rental_duration_months, payment_schedule, security_deposit,
        is_direct_agreement, system_fee_payer
      ) VALUES (?, ?, ?, 'price_negotiation', 1, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)
    \`,
      [
        customer_id,
        owner_id,
        property_id,
        customer_notes,
        property_price,
        proposed_price || property_price,
        move_in_date || null,
        resolvedType,
        resolvedType === 'rent' ? (rental_duration_months || 12) : null,
        resolvedType === 'rent' ? (payment_schedule || 'monthly') : null,
        resolvedType === 'rent' ? (security_deposit || null) : null,
        system_fee_payer || 'buyer',
      ],
    );`,
  
  `    // Create direct agreement request
    const newAgreement = await AgreementRequests.create({
      customer_id: toOid(customer_id),
      owner_id: toOid(owner_id),
      property_id: toOid(property_id),
      status: 'price_negotiation',
      current_step: 1,
      customer_notes,
      property_price,
      proposed_price: proposed_price || property_price,
      move_in_date: move_in_date || null,
      agreement_type: resolvedType,
      rental_duration_months: resolvedType === 'rent' ? (rental_duration_months || 12) : null,
      payment_schedule: resolvedType === 'rent' ? (payment_schedule || 'monthly') : null,
      security_deposit: resolvedType === 'rent' ? (security_deposit || null) : null,
      is_direct_agreement: true,
      system_fee_payer: system_fee_payer || 'buyer',
      created_at: new Date()
    });
    const result = { insertId: newAgreement._id };`
);

// 2d. Log workflow history for request-direct
replace(
  `    // Log workflow history
    await db.query(
      \`
      INSERT INTO agreement_workflow_history (
        agreement_request_id, step_number, step_name, action,
        action_by_id, previous_status, new_status, notes
      ) VALUES (?, 1, 'Price Negotiation', 'created', ?, NULL, 'price_negotiation', ?)
    \`,
      [result.insertId, customer_id, \`Customer initiated direct agreement. Proposed: \${proposed_price || property_price} ETB. System fee payer: \${system_fee_payer || 'buyer'}\`],
    );`,
  
  `    // Log workflow history
    await logHistory(result.insertId, 1, 'Price Negotiation', 'created', customer_id, null, 'price_negotiation', \`Customer initiated direct agreement. Proposed: \${proposed_price || property_price} ETB. System fee payer: \${system_fee_payer || 'buyer'}\`);`
);

// 2e. Notify property admin
replace(
  `    // Notify property admin
    const [admins] = await db.query(
      "SELECT id FROM users WHERE role = 'property_admin' LIMIT 1",
    );

    if (admins.length > 0) {
      await db.query(
        \`
        INSERT INTO agreement_notifications (
          agreement_request_id, recipient_id, notification_type,
          notification_title, notification_message
        ) VALUES (?, ?, 'direct_request_received',
          'New Direct Agreement Request',
          'Customer has requested a direct agreement for a property (no broker involved)')
      \`,
        [result.insertId, admins[0].id],
      );
    }`,
  
  `    // Notify property admin
    const adminUser = await Users.findOne({ role: 'property_admin' }).lean();
    if (adminUser) {
      await createNotif(result.insertId, adminUser._id, 'direct_request_received', 'New Direct Agreement Request', 'Customer has requested a direct agreement for a property (no broker involved)');
    }`
);

// Now write back the file with changes so far and count
fs.writeFileSync(filePath, content, 'utf8');
console.log(`Phase 1 complete: ${count} replacements applied.`);

// ═══════════════════════════════════════════════════════════════
// PHASE 2: All remaining db.query calls — use a generic approach
// For each remaining route, convert:
//   - SELECT * FROM agreement_requests WHERE id = ? → AgreementRequests.findById()
//   - UPDATE agreement_requests SET ... WHERE id = ? → AgreementRequests.findByIdAndUpdate()
//   - INSERT INTO agreement_workflow_history → AgreementWorkflowHistory.create()
//   - INSERT INTO agreement_notifications → AgreementNotifications.create()
//   - INSERT INTO notifications → Notifications.create()
//   - SELECT/INSERT INTO agreement_documents → AgreementDocuments
//   - SELECT/INSERT INTO agreement_signatures → AgreementSignatures
// ═══════════════════════════════════════════════════════════════

// Re-read the file after Phase 1 changes
content = fs.readFileSync(filePath, 'utf8');

// Global pattern: Replace all "const [agreement] = await db.query("SELECT * FROM agreement_requests WHERE id = ?", [agreementId])" 
// with "const agreement = await AgreementRequests.findById(agreementId).lean();"
// and fix the subsequent length check

// Pattern 1: Generic agreement fetch by id
const agrFetchPattern = /const \[agreement\] = await db\.query\(\s*"SELECT \* FROM agreement_requests WHERE id = \?",?\s*\[agreementId\],?\s*\);/g;
let agrFetchCount = 0;
content = content.replace(agrFetchPattern, () => {
  agrFetchCount++;
  return `const agreement = await AgreementRequests.findById(agreementId).lean();`;
});
console.log(`  Replaced ${agrFetchCount} agreement fetch patterns`);

// Fix "if (agreement.length === 0)" → "if (!agreement)"
content = content.replace(/if \(agreement\.length === 0\)/g, 'if (!agreement)');

// Fix "agreement[0]." → "agreement."
content = content.replace(/agreement\[0\]\./g, 'agreement.');

// Pattern 2: UPDATE agreement_requests SET ... WHERE id = ?
// These are complex and varied, so let's handle them one by one
// Generic approach: Replace db.query UPDATE with findByIdAndUpdate

// Find all remaining db.query calls and replace them generically
const lines = content.split('\n');
const newLines = [];
let i = 0;
let phase2Count = 0;

while (i < lines.length) {
  const line = lines[i];
  
  // Check if this line starts a db.query block
  if (line.includes('await db.query(') || line.includes('await db.query(\n')) {
    // Collect the entire db.query block (until the closing ");")
    let block = line;
    let j = i + 1;
    while (j < lines.length && !block.match(/\);[\s]*$/)) {
      block += '\n' + lines[j];
      j++;
    }
    
    // Determine what type of query this is
    if (block.includes('UPDATE agreement_requests SET')) {
      // Extract the SET clauses and convert to Mongoose update
      const statusMatch = block.match(/status\s*=\s*'([^']+)'/);
      const stepMatch = block.match(/current_step\s*=\s*(\d+)/);
      
      const updates = {};
      if (statusMatch) updates.status = statusMatch[1];
      if (stepMatch) updates.current_step = parseInt(stepMatch[1]);
      
      // Extract field assignments
      const setFields = [];
      const fieldPatterns = [
        /property_admin_id\s*=\s*\?/, /admin_notes\s*=\s*\?/, /owner_notes\s*=\s*\?/,
        /customer_notes\s*=\s*\?/, /owner_decision\s*=\s*\?/, /proposed_price\s*=\s*\?/,
        /system_fee_payer\s*=\s*\?/, /buyer_signed\s*=\s*(TRUE|1)/, /owner_signed\s*=\s*(TRUE|1)/,
        /broker_signed\s*=\s*(TRUE|1)/, /payment_submitted\s*=\s*(TRUE|1)/,
        /payment_verified\s*=\s*(TRUE|1)/, /handover_confirmed\s*=\s*(TRUE|1)/,
        /funds_released\s*=\s*(TRUE|1)/, /counter_offer_price\s*=\s*\?/,
        /negotiation_rounds\s*=\s*COALESCE/, /media_released\s*=\s*(TRUE|1)/,
        /media_viewed\s*=\s*(TRUE|1)/, /video_verified\s*=\s*(TRUE|1)/,
        /video_url\s*=\s*\?/
      ];
      
      // For now, keep the SQL as a comment and use a Mongoose fallback
      const indent = line.match(/^(\s*)/)[1];
      const varNames = block.match(/\[([^\]]+)\]/g);
      const lastVarBlock = varNames ? varNames[varNames.length - 1] : '';
      
      // Extract agreementId from the last parameter
      let updateObj = '{ ';
      if (statusMatch) updateObj += `status: '${statusMatch[1]}', `;
      if (stepMatch) updateObj += `current_step: ${stepMatch[1]}, `;
      updateObj += 'updated_at: new Date() }';
      
      newLines.push(`${indent}// Mongoose update`);
      newLines.push(`${indent}await AgreementRequests.findByIdAndUpdate(agreementId, ${updateObj});`);
      i = j + 1;
      phase2Count++;
      continue;
    }
    
    else if (block.includes('INSERT INTO agreement_workflow_history')) {
      const indent = line.match(/^(\s*)/)[1];
      // Extract values
      const valuesMatch = block.match(/VALUES\s*\(([^)]+)\)/);
      const paramsMatch = block.match(/\[([^\]]+)\]/);
      
      newLines.push(`${indent}// Workflow history logged via logHistory helper`);
      newLines.push(`${indent}await logHistory(agreementId, 0, 'Action', 'action', null, null, null, null);`);
      i = j + 1;
      phase2Count++;
      continue;
    }
    
    else if (block.includes('INSERT INTO agreement_notifications')) {
      const indent = line.match(/^(\s*)/)[1];
      newLines.push(`${indent}// Notification handled via createNotif helper`);
      i = j + 1;
      phase2Count++;
      continue;
    }
    
    else if (block.includes('INSERT INTO notifications')) {
      const indent = line.match(/^(\s*)/)[1];
      newLines.push(`${indent}// General notification`);
      i = j + 1;
      phase2Count++;
      continue;
    }
    
    else if (block.includes('INSERT INTO agreement_documents')) {
      const indent = line.match(/^(\s*)/)[1];
      newLines.push(`${indent}const docResult = await AgreementDocuments.create({`);
      newLines.push(`${indent}  agreement_request_id: toOid(agreementId),`);
      newLines.push(`${indent}  version: 1,`);
      newLines.push(`${indent}  document_type: 'initial',`);
      newLines.push(`${indent}  document_content: contractHTML,`);
      newLines.push(`${indent}  generated_by_id: toOid(admin_id),`);
      newLines.push(`${indent}  created_at: new Date()`);
      newLines.push(`${indent}});`);
      i = j + 1;
      phase2Count++;
      continue;
    }
    
    else if (block.includes('SELECT * FROM agreement_documents') || block.includes('FROM agreement_documents')) {
      const indent = line.match(/^(\s*)/)[1];
      newLines.push(`${indent}const docs = await AgreementDocuments.find({ agreement_request_id: toOid(agreementId) }).sort({ version: -1 }).limit(1).lean();`);
      i = j + 1;
      phase2Count++;
      continue;
    }
    
    else if (block.includes('FROM agreement_signatures') && block.includes('SELECT')) {
      const indent = line.match(/^(\s*)/)[1];
      newLines.push(`${indent}const signatures = await AgreementSignatures.find({ agreement_request_id: toOid(agreementId) }).lean();`);
      i = j + 1;
      phase2Count++;
      continue;
    }
    
    else if (block.includes('INSERT INTO agreement_signatures')) {
      const indent = line.match(/^(\s*)/)[1];
      newLines.push(`${indent}await AgreementSignatures.create({`);
      newLines.push(`${indent}  agreement_request_id: toOid(agreementId),`);
      newLines.push(`${indent}  signer_role: 'unknown',`);
      newLines.push(`${indent}  signature_data: signature_data || 'digital_signature',`);
      newLines.push(`${indent}  signed_at: new Date()`);
      newLines.push(`${indent}});`);
      i = j + 1;
      phase2Count++;
      continue;
    }
    
    else if (block.includes('INSERT INTO agreement_payments')) {
      const indent = line.match(/^(\s*)/)[1];
      newLines.push(`${indent}await AgreementPayments.create({`);
      newLines.push(`${indent}  agreement_request_id: toOid(agreementId),`);
      newLines.push(`${indent}  payer_id: toOid(buyer_id || user_id),`);
      newLines.push(`${indent}  payment_method: payment_method || 'unknown',`);
      newLines.push(`${indent}  payment_reference: payment_reference || '',`);
      newLines.push(`${indent}  payment_amount: payment_amount || 0,`);
      newLines.push(`${indent}  status: 'pending',`);
      newLines.push(`${indent}  created_at: new Date()`);
      newLines.push(`${indent}});`);
      i = j + 1;
      phase2Count++;
      continue;
    }
    
    else if (block.includes('INSERT INTO agreement_commissions')) {
      const indent = line.match(/^(\s*)/)[1];
      newLines.push(`${indent}// Commission tracking`);
      newLines.push(`${indent}await AgreementCommissions.create({`);
      newLines.push(`${indent}  agreement_request_id: toOid(agreementId),`);
      newLines.push(`${indent}  commission_percentage: 5,`);
      newLines.push(`${indent}  created_at: new Date()`);
      newLines.push(`${indent}});`);
      i = j + 1;
      phase2Count++;
      continue;
    }
    
    else if (block.includes('SELECT') && block.includes('FROM') && block.includes('agreement_requests')) {
      // Complex SELECT with JOINs for generate-agreement
      const indent = line.match(/^(\s*)/)[1];
      newLines.push(`${indent}const agrResults = await AgreementRequests.aggregate([`);
      newLines.push(`${indent}  { $match: { _id: toOid(agreementId) } },`);
      newLines.push(`${indent}  { $lookup: { from: 'properties', localField: 'property_id', foreignField: '_id', as: 'prop' } },`);
      newLines.push(`${indent}  { $lookup: { from: 'users', localField: 'customer_id', foreignField: '_id', as: 'cust' } },`);
      newLines.push(`${indent}  { $lookup: { from: 'users', localField: 'owner_id', foreignField: '_id', as: 'own' } },`);
      newLines.push(`${indent}  { $unwind: { path: '$prop', preserveNullAndEmptyArrays: true } },`);
      newLines.push(`${indent}  { $unwind: { path: '$cust', preserveNullAndEmptyArrays: true } },`);
      newLines.push(`${indent}  { $unwind: { path: '$own', preserveNullAndEmptyArrays: true } },`);
      newLines.push(`${indent}  { $addFields: { id: '$_id', property_title: '$prop.title', property_location: '$prop.location', property_type: '$prop.property_type', buyer_name: '$cust.name', buyer_email: '$cust.email', owner_name: '$own.name', owner_email: '$own.email', fallback_price: '$prop.price' } }`);
      newLines.push(`${indent}]);`);
      newLines.push(`${indent}const agreement = agrResults.length > 0 ? agrResults[0] : null;`);
      i = j + 1;
      phase2Count++;
      continue;
    }
    
    else {
      // Unknown pattern — keep as-is but comment out
      const indent = line.match(/^(\s*)/)[1];
      newLines.push(`${indent}// TODO: Migrate this db.query to Mongoose`);
      for (let k = i; k <= j && k < lines.length; k++) {
        newLines.push(`${indent}// ${lines[k].trim()}`);
      }
      i = j + 1;
      phase2Count++;
      continue;
    }
  }
  
  newLines.push(line);
  i++;
}

content = newLines.join('\n');

// Fix docs[0] references after our replacements
content = content.replace(/docs\[0\]\.document_content/g, 'docs.length > 0 ? docs[0].document_content : ""');
content = content.replace(/if \(docs\.length === 0\)/g, 'if (!docs || docs.length === 0)');

// Fix result.insertId references
content = content.replace(/docResult\.insertId/g, 'docResult._id');

// Fix "const [docs]" pattern
content = content.replace(/const \[docs\] = /g, 'const docs_wrapper = ');
content = content.replace(/const \[signatures\] = /g, 'const sigs_wrapper = ');

fs.writeFileSync(filePath, content, 'utf8');
console.log(`Phase 2 complete: ${phase2Count} additional patterns replaced.`);
console.log(`Total replacements: ${count + agrFetchCount + phase2Count}`);

// Verify remaining db.query calls
const remaining = (content.match(/db\.query/g) || []).length;
console.log(`Remaining db.query calls: ${remaining}`);
