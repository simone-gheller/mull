import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import request from 'supertest'
import Fastify from 'fastify'

process.env.NODE_ENV = 'test'

describe('Minimal Test', () => {
  let app

  beforeAll(async () => {
    app = Fastify({ logger: false })
    
    app.get('/health', async (request, reply) => {
      return { status: 'ok', timestamp: new Date().toISOString() }
    })

    await app.ready()
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  it('should return health status', async () => {
    const response = await request(app.server)
      .get('/health')
      .expect(200)

    expect(response.body).toMatchObject({
      status: 'ok'
    })
    expect(response.body.timestamp).toBeTruthy()
  })
})