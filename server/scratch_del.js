const db = require('../server/config/db');
(async () => {
  try {
    const [users] = await db.query('SELECT id FROM users WHERE role IN (\'user\', \'customer\', \'broker\') LIMIT 1');
    if (!users || users.length === 0) {
      console.log('No users found.');
      process.exit(0);
    }
    const userId = users[0].id || users.id;
    console.log('Attempting delete user', userId);
    
    // First, let's try the existing deletions
    await db.query('DELETE FROM customer_profiles WHERE user_id = $1', [userId]).catch(() => { });
    await db.query('DELETE FROM owner_profiles WHERE user_id = $1', [userId]).catch(() => { });
    await db.query('DELETE FROM broker_profiles WHERE user_id = $1', [userId]).catch(() => { });
    await db.query('DELETE FROM notifications WHERE user_id = $1', [userId]).catch(() => { });
    await db.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [userId, userId]).catch(() => { });

    await db.query('DELETE FROM users WHERE id = $1', [userId]);
    console.log('Success deleting user', userId);
    process.exit(0);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
