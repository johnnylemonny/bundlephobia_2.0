try {
  console.log('Resolving supertest...');
  console.log('Path:', require.resolve('supertest'));
} catch (e) {
  console.error('Failed to resolve supertest:', e.message);
}

try {
  console.log('Resolving jest...');
  console.log('Path:', require.resolve('jest'));
} catch (e) {
  console.error('Failed to resolve jest:', e.message);
}

console.log('Current directory:', process.cwd());
console.log('Node modules exists:', require('fs').existsSync('node_modules'));
console.log('Supertest exists in node_modules:', require('fs').existsSync('node_modules/supertest'));
