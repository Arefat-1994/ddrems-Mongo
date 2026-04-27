const db = require('./server/config/db');
async function check() {
  const [props] = await db.query("SELECT id, title, main_image FROM properties WHERE status='active' AND verified=true LIMIT 5");
  console.log('Properties:', JSON.stringify(props, null, 2));
  const [imgs] = await db.query("SELECT property_id, image_url, image_type FROM property_images LIMIT 10");
  console.log('Images:', JSON.stringify(imgs, null, 2));
  process.exit();
}
check();
