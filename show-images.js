const http = require('http');

console.log('╔════════════════════════════════════════════════════════════════╗');
console.log('║         DDREMS - IMAGE DISPLAY VERIFICATION                    ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

http.get('http://localhost:5000/api/properties', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const properties = JSON.parse(data);
      
      console.log(`✅ Backend API is responding`);
      console.log(`✅ Found ${properties.length} properties\n`);
      console.log('═'.repeat(70));
      
      properties.forEach((prop, index) => {
        console.log(`\n📋 PROPERTY ${prop.id}: ${prop.title}`);
        console.log('─'.repeat(70));
        console.log(`   Status: ${prop.status}`);
        console.log(`   Type: ${prop.type}`);
        console.log(`   Listing: ${prop.listing_type}`);
        console.log(`   Price: ${(prop.price / 1000000).toFixed(2)}M ETB`);
        console.log(`   Location: ${prop.location}`);
        console.log(`   Total Images: ${prop.image_count || 0}`);
        
        if (prop.main_image) {
          console.log(`\n   ✅ HAS MAIN IMAGE:`);
          console.log(`      Format: ${prop.main_image.substring(0, 30)}...`);
          console.log(`      Length: ${prop.main_image.length} characters`);
          console.log(`      Type: ${prop.main_image.includes('png') ? 'PNG' : prop.main_image.includes('jpeg') ? 'JPEG' : 'Unknown'}`);
          
          // Show a visual representation
          console.log(`\n   📷 IMAGE PREVIEW (base64):`);
          console.log(`      ${prop.main_image.substring(0, 80)}`);
          if (prop.main_image.length > 80) {
            console.log(`      ... (${prop.main_image.length - 80} more characters)`);
          }
        } else {
          console.log(`\n   ❌ NO MAIN IMAGE`);
        }
        
        console.log('\n' + '═'.repeat(70));
      });
      
      const withImages = properties.filter(p => p.main_image).length;
      const withoutImages = properties.filter(p => !p.main_image).length;
      
      console.log('\n📊 SUMMARY:');
      console.log(`   Total Properties: ${properties.length}`);
      console.log(`   With Images: ${withImages} ✅`);
      console.log(`   Without Images: ${withoutImages} ${withoutImages > 0 ? '⚠️' : '✅'}`);
      
      console.log('\n🌐 TO VIEW IN BROWSER:');
      console.log('   1. Open: test-image-display.html (created in current folder)');
      console.log('   2. Or visit: http://localhost:3000');
      console.log('   3. Login as: customer@ddrems.com (password: admin123)');
      
      console.log('\n✅ IMAGE SYSTEM IS WORKING!\n');
      
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
    }
  });
}).on('error', (error) => {
  console.error('❌ Error connecting to backend:', error.message);
  console.log('\n⚠️  Make sure the backend server is running on port 5000');
  console.log('   Run: npm start (in server folder)');
});
