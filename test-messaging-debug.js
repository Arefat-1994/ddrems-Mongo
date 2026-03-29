#!/usr/bin/env node

const axios = require('axios');
const mysql = require('mysql2/promise');
require('dotenv').config();

const API_BASE = 'http://localhost:5000/api';
const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ddrems',
  port: process.env.DB_PORT || 3307
};

async function test() {
  console.log('\n🧪 MESSAGING SYSTEM - DEBUG TEST\n');

  try {
    // Connect to DB
    console.log('1️⃣  Connecting to database...');
    const connection = await mysql.createConnection(DB_CONFIG);
    console.log('✅ Connected\n');

    // Get users
    console.log('2️⃣  Getting users...');
    const usersResponse = await axios.get(`${API_BASE}/users`);
    const users = usersResponse.data.filter(u => u.id);
    console.log(`✅ Found ${users.length} users\n`);

    if (users.length < 2) {
      console.error('❌ Need at least 2 users');
      process.exit(1);
    }

    const sender = users[0];
    const receiver = users[1];

    console.log(`Sender: ${sender.name} (ID: ${sender.id}, Role: ${sender.role})`);
    console.log(`Receiver: ${receiver.name} (ID: ${receiver.id}, Role: ${receiver.role})\n`);

    // Test sending message
    console.log('3️⃣  Sending test message...');
    console.log(`POST ${API_BASE}/messages?userId=${sender.id}`);
    console.log('Body:', JSON.stringify({
      sender_id: sender.id,
      receiver_id: receiver.id,
      subject: 'Test Message',
      message: 'This is a test',
      message_type: 'general'
    }, null, 2));

    try {
      const response = await axios.post(`${API_BASE}/messages?userId=${sender.id}`, {
        sender_id: sender.id,
        receiver_id: receiver.id,
        subject: 'Test Message',
        message: 'This is a test',
        message_type: 'general'
      });

      console.log('\n✅ Message sent successfully!');
      console.log('Response:', JSON.stringify(response.data, null, 2));

      const messageId = response.data.id;

      // Check in database
      console.log('\n4️⃣  Checking message in database...');
      const [messages] = await connection.query(
        'SELECT * FROM messages WHERE id = ?',
        [messageId]
      );

      if (messages.length > 0) {
        console.log('✅ Message found in database');
        console.log('Message data:', JSON.stringify(messages[0], null, 2));
      } else {
        console.log('❌ Message not found in database');
      }

      // Check receiver can see it
      console.log('\n5️⃣  Checking if receiver can see message...');
      const receiverMessages = await axios.get(
        `${API_BASE}/messages/user/${receiver.id}?userId=${receiver.id}`
      );

      const found = receiverMessages.data.find(m => m.id === messageId);
      if (found) {
        console.log('✅ Receiver can see the message');
        console.log('Message:', JSON.stringify(found, null, 2));
      } else {
        console.log('❌ Receiver cannot see the message');
        console.log('Receiver messages:', JSON.stringify(receiverMessages.data, null, 2));
      }

      console.log('\n✅ TEST PASSED - Both sides can send and receive messages!\n');

    } catch (error) {
      console.log('\n❌ Error sending message:');
      console.log('Status:', error.response?.status);
      console.log('Data:', JSON.stringify(error.response?.data, null, 2));
      console.log('Message:', error.message);
    }

    await connection.end();

  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

test();
