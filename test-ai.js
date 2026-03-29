// Quick test to verify the AI module loads correctly
try {
    const ai = require('./server/routes/ai.js');
    console.log('✅ AI module loaded successfully');
    console.log('Type:', typeof ai);
} catch (e) {
    console.error('❌ Error loading AI module:', e.message);
    if (e.stack) console.error(e.stack.split('\n').slice(0, 5).join('\n'));
}
