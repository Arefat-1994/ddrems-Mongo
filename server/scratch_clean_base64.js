const mongoose = require('mongoose');

async function clean() {
  await mongoose.connect('mongodb://127.0.0.1:27017/ddre');
  const db = mongoose.connection.db;
  
  const properties = await db.collection('properties').find().toArray();
  for (let p of properties) {
    let changed = false;
    for (let k of Object.keys(p)) {
      if (typeof p[k] === 'string' && p[k].length > 100000) {
        p[k] = 'https://placehold.co/600x400?text=Image+Too+Large';
        changed = true;
      }
    }
    if (changed) {
      await db.collection('properties').updateOne({_id: p._id}, {$set: p});
      console.log('Fixed property', p._id);
    }
  }

  const images = await db.collection('propertyimages').find().toArray();
  for (let i of images) {
    let changed = false;
    for (let k of Object.keys(i)) {
      if (typeof i[k] === 'string' && i[k].length > 100000) {
        i[k] = 'https://placehold.co/600x400?text=Image+Too+Large';
        changed = true;
      }
    }
    if (changed) {
      await db.collection('propertyimages').updateOne({_id: i._id}, {$set: i});
      console.log('Fixed image', i._id);
    }
  }
  
  console.log('Done');
  process.exit(0);
}
clean();
