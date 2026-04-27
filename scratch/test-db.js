const db = require('../server/config/db');

async function test() {
  try {
    const [rows] = await db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'property_images'");
    console.log("Success:", rows);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    process.exit();
  }
}
test();
