const db = require('./server/config/db');
db.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'agreement_requests'")
  .then(([rows]) => { console.log(rows); process.exit(0); })
  .catch(err => { console.error(err); process.exit(1); });
