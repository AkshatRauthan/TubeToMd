import request from 'supertest';
import app from '../app';

describe('App & Routing', () => {
  it('returns 404 for an unknown API route', async () => {
    const res = await request(app).get('/api/v1/unknown-route-1234');
    expect(res.status).toBe(404);
  });
  
  it('returns 404 for other unknown routes', async () => {
    const res = await request(app).get('/api/v1/unknown');
    expect(res.statusCode).toBe(404);
  });
});
