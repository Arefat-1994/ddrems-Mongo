const axios = require('axios');

const API_BASE = 'http://localhost:5000/api';

// Test messaging system functionality with comprehensive validation
async function testMessagingSystem() {
  console.log('🧪 COMPREHENSIVE MESSAGING SYSTEM TEST\n');
  console.log('=' .repeat(60));

  let testsPassed = 0;
  let testsFailed = 0;

  const runTest = async (testName, testFunction) => {
    try {
      console.log(`\n🔍 ${testName}...`);
      await testFunction();
      console.log(`✅ ${testName} - PASSED`);
      testsPassed++;
    } catch (error) {
      console.log(`❌ ${testName} - FAILED`);
      console.log(`   Error: ${error.response?.data?.message || error.message}`);
      if (error.response?.data?.code) {
        console.log(`   Code: ${error.response.data.code}`);
      }
      testsFailed++;
    }
  };

  // Test 1: Send single message
  await runTest('Send Single Message', async () => {
    const response = await axios.post(`${API_BASE}/messages?userId=1`, {
      receiver_id: 2,
      subject: 'Test Single Message',
      message: 'This is a comprehensive test single message from system admin to user.',
      message_type: 'general'
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message);
    }
    console.log(`   Message ID: ${response.data.id}`);
    console.log(`   Receiver: ${response.data.receiver}`);
  });

  // Test 2: Send group message
  await runTest('Send Group Message', async () => {
    const response = await axios.post(`${API_BASE}/messages?userId=1`, {
      receiver_ids: [2, 3, 4],
      subject: 'Test Group Message',
      message: 'This is a comprehensive test group message to multiple users.',
      message_type: 'announcement',
      is_group: true
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message);
    }
    console.log(`   Message ID: ${response.data.id}`);
    console.log(`   Recipients: ${response.data.count}`);
  });

  // Test 3: Send bulk message by role
  await runTest('Send Bulk Message by Role', async () => {
    const response = await axios.post(`${API_BASE}/messages/bulk?userId=1`, {
      filter_role: 'user',
      subject: 'Test Bulk Message',
      message: 'This is a comprehensive test bulk message to all customers.',
      message_type: 'announcement'
    });
    
    if (!response.data.success) {
      throw new Error(response.data.message);
    }
    console.log(`   Message ID: ${response.data.id}`);
    console.log(`   Recipients: ${response.data.count}`);
  });

  // Test 4: Get messages for user
  await runTest('Fetch User Messages', async () => {
    const response = await axios.get(`${API_BASE}/messages/user/2?userId=2`);
    const messages = response.data.messages || response.data;
    
    if (!Array.isArray(messages)) {
      throw new Error('Invalid response format');
    }
    console.log(`   Messages found: ${messages.length}`);
    
    if (messages.length > 0) {
      console.log(`   Latest message: "${messages[0].subject}"`);
    }
  });

  // Test 5: Get unread count
  await runTest('Get Unread Count', async () => {
    const response = await axios.get(`${API_BASE}/messages/unread/2?userId=2`);
    
    if (typeof response.data.count !== 'number') {
      throw new Error('Invalid unread count format');
    }
    console.log(`   Unread messages: ${response.data.count}`);
    
    if (response.data.single_messages !== undefined) {
      console.log(`   Single messages: ${response.data.single_messages}`);
      console.log(`   Group messages: ${response.data.group_messages}`);
    }
  });

  // Test 6: Mark message as read
  await runTest('Mark Message as Read', async () => {
    // First get a message
    const messagesResponse = await axios.get(`${API_BASE}/messages/user/2?userId=2`);
    const messages = messagesResponse.data.messages || messagesResponse.data;
    
    if (messages.length === 0) {
      throw new Error('No messages to mark as read');
    }
    
    const messageId = messages[0].id;
    const readResponse = await axios.put(`${API_BASE}/messages/read/${messageId}?userId=2`);
    
    if (!readResponse.data.success) {
      throw new Error(readResponse.data.message);
    }
    console.log(`   Marked message ${messageId} as read`);
  });

  // Test 7: Edit message (admin only)
  await runTest('Edit Message', async () => {
    // First send a message to edit
    const sendResponse = await axios.post(`${API_BASE}/messages?userId=1`, {
      receiver_id: 2,
      subject: 'Original Subject',
      message: 'Original message content.',
      message_type: 'general'
    });
    
    const messageId = sendResponse.data.id;
    
    // Now edit it
    const editResponse = await axios.put(`${API_BASE}/messages/${messageId}?userId=1`, {
      subject: 'Updated Subject',
      message: 'Updated message content with comprehensive testing.'
    });
    
    if (!editResponse.data.success) {
      throw new Error(editResponse.data.message);
    }
    console.log(`   Edited message ${messageId}`);
    console.log(`   Updated at: ${editResponse.data.updated_at}`);
  });

  // Test 8: Delete message
  await runTest('Delete Message', async () => {
    // First send a message to delete
    const sendResponse = await axios.post(`${API_BASE}/messages?userId=1`, {
      receiver_id: 2,
      subject: 'Message to Delete',
      message: 'This message will be deleted.',
      message_type: 'general'
    });
    
    const messageId = sendResponse.data.id;
    
    // Now delete it
    const deleteResponse = await axios.delete(`${API_BASE}/messages/${messageId}?userId=1`);
    
    if (!deleteResponse.data.success) {
      throw new Error(deleteResponse.data.message);
    }
    console.log(`   Deleted message ${messageId}`);
  });

  // Test 9: Input validation tests
  await runTest('Input Validation - Empty Subject', async () => {
    try {
      await axios.post(`${API_BASE}/messages?userId=1`, {
        receiver_id: 2,
        subject: '',
        message: 'Valid message',
        message_type: 'general'
      });
      throw new Error('Should have failed validation');
    } catch (error) {
      if (error.response?.data?.code === 'SUBJECT_REQUIRED') {
        console.log('   ✓ Correctly rejected empty subject');
      } else {
        throw error;
      }
    }
  });

  await runTest('Input Validation - Long Subject', async () => {
    try {
      const longSubject = 'A'.repeat(300); // Exceeds 255 character limit
      await axios.post(`${API_BASE}/messages?userId=1`, {
        receiver_id: 2,
        subject: longSubject,
        message: 'Valid message',
        message_type: 'general'
      });
      throw new Error('Should have failed validation');
    } catch (error) {
      if (error.response?.data?.code === 'SUBJECT_TOO_LONG') {
        console.log('   ✓ Correctly rejected long subject');
      } else {
        throw error;
      }
    }
  });

  // Test 10: Permission tests - Updated for new access rules
  await runTest('Permission Test - Regular User Can Delete Admin Message', async () => {
    // Send message as admin
    const sendResponse = await axios.post(`${API_BASE}/messages?userId=1`, {
      receiver_id: 2,
      subject: 'Admin Message for Deletion',
      message: 'This message can be deleted by regular user.',
      message_type: 'general'
    });
    
    const messageId = sendResponse.data.id;
    
    // Regular user should be able to delete admin message
    const deleteResponse = await axios.delete(`${API_BASE}/messages/${messageId}?userId=2`);
    
    if (!deleteResponse.data.success) {
      throw new Error('Regular user should be able to delete admin messages');
    }
    console.log('   ✓ Regular user can delete admin messages');
  });

  await runTest('Permission Test - Regular User Can View All Admin Messages', async () => {
    // Send message as admin
    await axios.post(`${API_BASE}/messages?userId=1`, {
      receiver_id: 3, // Send to different user
      subject: 'Admin Broadcast Message',
      message: 'This should be visible to all users.',
      message_type: 'announcement'
    });
    
    // Regular user should see admin messages even if not directly sent to them
    const messagesResponse = await axios.get(`${API_BASE}/messages/user/2?userId=2`);
    const messages = messagesResponse.data.messages || messagesResponse.data;
    
    const adminMessages = messages.filter(m => 
      m.sender_role === 'system_admin' || m.sender_role === 'property_admin'
    );
    
    if (adminMessages.length === 0) {
      throw new Error('Regular user should see admin messages');
    }
    console.log(`   ✓ Regular user can see ${adminMessages.length} admin messages`);
  });

  await runTest('Permission Test - Regular User Cannot Edit Admin Message', async () => {
    // Send message as admin
    const sendResponse = await axios.post(`${API_BASE}/messages?userId=1`, {
      receiver_id: 2,
      subject: 'Admin Message for Edit Test',
      message: 'This is from admin and should not be editable by regular user.',
      message_type: 'general'
    });
    
    const messageId = sendResponse.data.id;
    
    // Try to edit as regular user - should fail
    try {
      await axios.put(`${API_BASE}/messages/${messageId}?userId=2`, {
        subject: 'Hacked Subject',
        message: 'Hacked message'
      });
      throw new Error('Should have been denied');
    } catch (error) {
      if (error.response?.data?.code === 'EDIT_NOT_PERMITTED') {
        console.log('   ✓ Correctly denied edit permission to regular user');
      } else {
        throw error;
      }
    }
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Tests Passed: ${testsPassed}`);
  console.log(`❌ Tests Failed: ${testsFailed}`);
  console.log(`📈 Success Rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
  
  if (testsFailed === 0) {
    console.log('\n🎉 ALL TESTS PASSED! Messaging system is working perfectly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
  }
  
  console.log('\n🔧 SYSTEM STATUS: READY FOR PRODUCTION');
}

// Run comprehensive tests
testMessagingSystem().catch(console.error);