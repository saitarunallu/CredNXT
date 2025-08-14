import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import express from 'express'
import { registerHealthRoutes } from '../../server/routes/health'

describe('Health Routes', () => {
  let app: express.Express

  beforeAll(() => {
    app = express()
    registerHealthRoutes(app)
  })

  describe('GET /api/health', () => {
    it('should return basic health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200)

      expect(response.body).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        version: expect.any(String)
      })
    })
  })

  describe('GET /api/live', () => {
    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/api/live')
        .expect(200)

      expect(response.body).toEqual({
        status: 'alive'
      })
    })
  })
})