const passkey = 'bce08a82832f9d0efbb825c52ceebe026f8326dce9506902fe042763486c14af';
const generated = Buffer.from(passkey).toString('base64');
const fromPostman = 'YmNlMDhhODI4MzJmOWQwZWZiYjgyNWM1MmNlZWJlMDI2ZjgzMjZkY2U5NTA2OTAyZmUwNDI3NjM0ODZjMTRhZg==';

console.log('Generated:', generated);
console.log('Postman:  ', fromPostman);
console.log('Match:', generated === fromPostman ? '✅ YES - Password is correct!' : '❌ NO - Still wrong');
