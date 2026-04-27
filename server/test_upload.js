const axios = require('axios');
const db = require('./config/db');

async function testUpload() {
  try {
    const [props] = await db.query('SELECT id FROM properties LIMIT 1');
    if (!props || props.length === 0) {
      console.log('No properties exist to test with.');
      process.exit(1);
    }
    const propId = props[0].id;
    console.log(`Using existing property_id ${propId} for test.`);

    const response = await axios.post('http://localhost:5000/api/property-documents', {
      property_id: propId,
      document_name: 'test_doc.pdf',
      document_url: 'data:application/pdf;base64,VEVTVApd',
      document_type: 'title_deed',
      uploaded_by: 'undefined' // Testing invalid string case
    });
    console.log('Success:', response.data);
  } catch (error) {
    console.log('--- ERROR OBJECT ---');
    console.error(error.response ? error.response.data : error.message);
  }
  process.exit(0);
}

testUpload();
