import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import request from 'supertest'
import { PrismaClient } from '@prisma/client'

// Set test environment before importing server
process.env.NODE_ENV = 'test'

import buildFastify from '../src/server-simple.js'

describe('Simple Health Check', () => {
  let app
  let prisma

  beforeAll(async () => {
    prisma = new PrismaClient()
    app = await buildFastify()
    
    // Clean database
    await prisma.$transaction([
      prisma.session.deleteMany(),
      prisma.user.deleteMany()
    ])
  })

  afterAll(async () => {
    if (app) {
      await app.close()
    }
    if (prisma) {
      await prisma.$disconnect()
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