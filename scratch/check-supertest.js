try {
  const supertest = require('supertest');
  console.log('SUCCESS: supertest loaded');
} catch (e) {
  console.error('FAILURE: supertest not found');
  console.error(e.message);
  process.exit(1);
}
