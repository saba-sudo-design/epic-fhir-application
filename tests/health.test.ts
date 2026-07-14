import request from 'supertest';
import { createApp } from '../src/index';

describe('API routes', () => {
  const app = createApp();

  it('GET /health returns ok', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
