const request = require('supertest');
const app = require('../src/app');

describe('POST /leads validation', () => {
  it('rejects when required fields are missing', async () => {
    const res = await request(app)
      .post('/leads')
      .send({ name: 'OnlyName' }); // missing phone, service
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name, phone, and service are required/i);
  });
});
