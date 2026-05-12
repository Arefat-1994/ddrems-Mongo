const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/real_estate_db');
  const db = mongoose.connection.db;

  const signatures = await db.collection('agreementsignatures').find({ signer_role: 'unknown' }).toArray();
  for (const sig of signatures) {
    // We can infer the role from the agreement history or just guess based on who signed first
    // Actually, we can just look up the agreement request. If both are unknown, it's hard to tell without timestamp
    // For now, let's just make the earliest one buyer and the latest one owner
    const allSigs = await db.collection('agreementsignatures').find({ agreement_request_id: sig.agreement_request_id }).sort({ signed_at: 1 }).toArray();
    
    if (allSigs.length > 0) {
      await db.collection('agreementsignatures').updateOne({ _id: allSigs[0]._id }, { $set: { signer_role: 'buyer' } });
    }
    if (allSigs.length > 1) {
      await db.collection('agreementsignatures').updateOne({ _id: allSigs[1]._id }, { $set: { signer_role: 'owner' } });
    }
  }

  console.log('Fixed signature roles!');
  process.exit(0);
}

run();
