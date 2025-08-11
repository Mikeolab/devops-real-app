const request = require('supertest');
const app = require('../src/app');

describe('Metrics', () => {
  it('GET /metrics returns Prometheus text', async () => {
    const res = await request(app).get('/metrics');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/plain/i);
    expect(res.text).toMatch(/process_cpu_seconds_total|http_requests_total/);
  });
});
