const db=require('../server/config/db'); 
async function run() { 
  try { 
    const [cols]=await db.query("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'agreement_payments' AND column_name='receipt_file_path'"); 
    console.log(cols); 
  } catch(e) { 
    console.error(e); 
  } finally { 
    process.exit(); 
  } 
} 
run();
