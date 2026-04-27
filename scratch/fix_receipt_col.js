const db=require('./server/config/db'); 
async function fix() { 
  try { 
    await db.query("ALTER TABLE agreement_payments ALTER COLUMN receipt_file_path TYPE TEXT"); 
    console.log("Updated agreement_payments.receipt_file_path to TEXT"); 
    
    await db.query("ALTER TABLE payment_receipts ALTER COLUMN receipt_file_path TYPE TEXT"); 
    console.log("Updated payment_receipts.receipt_file_path to TEXT"); 
  } catch(e) { 
    console.error(e); 
  } finally { 
    process.exit(); 
  } 
} 
fix();
