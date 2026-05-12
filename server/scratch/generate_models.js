const fs = require('fs');
const path = require('path');

const schemaJson = require('./schema.json');

const modelsDir = path.join(__dirname, '../models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir);
}

const typeMapping = {
  'integer': 'Number',
  'character varying': 'String',
  'text': 'String',
  'numeric': 'Number',
  'boolean': 'Boolean',
  'timestamp without time zone': 'Date',
  'date': 'Date',
  'jsonb': 'Object',
  'bigint': 'Number'
};

for (const [tableName, columns] of Object.entries(schemaJson)) {
  if (tableName.startsWith('v_')) continue; // Skip views

  const modelName = tableName.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
  let schemaFields = '{\n';

  columns.forEach(col => {
    const [name, type] = col.split(': ');
    if (name === 'id') return; // Mongoose adds _id automatically

    let mType = typeMapping[type] || 'String';
    
    // Guess references
    if (name.endsWith('_id')) {
        schemaFields += `  ${name}: { type: mongoose.Schema.Types.ObjectId, ref: 'Unknown' },\n`;
    } else {
        schemaFields += `  ${name}: { type: ${mType} },\n`;
    }
  });

  schemaFields += '}';

  const modelContent = `const mongoose = require('mongoose');\n\nconst ${modelName}Schema = new mongoose.Schema(${schemaFields}, { timestamps: true });\n\nmodule.exports = mongoose.model('${modelName}', ${modelName}Schema);\n`;

  fs.writeFileSync(path.join(modelsDir, `${modelName}.js`), modelContent);
  console.log(`Generated ${modelName}.js`);
}

// Generate index.js
const files = fs.readdirSync(modelsDir).filter(f => f.endsWith('.js') && f !== 'index.js');
let indexContent = '';
files.forEach(f => {
  const name = f.replace('.js', '');
  indexContent += `exports.${name} = require('./${name}');\n`;
});
fs.writeFileSync(path.join(modelsDir, 'index.js'), indexContent);
console.log('Generated index.js');
