import { PrismaClient } from '@prisma/client'
import fastify from '../../src/server.js'

let testPrisma
let testApp

export const setupTestServer = async () => {
  testPrisma = new PrismaClient()
  
  // Clean database before tests
  await testPrisma.$transaction([
    testPrisma.session.deleteMany(),
    testPrisma.user.deleteMany()
  ])

  // Create test app
  testApp = fastify

  return { app: testApp, prisma: testPrisma }
}

export const teardownTestServer = async () => {
  if (testApp) {
    await testApp.close()
  }
  if (testPrisma) {
    await testPrisma.$disconnect()
  }
}

export const cleanDatabase = async () => {
  if (testPrisma) {
    await testPrisma.$transaction([
      testPrisma.session.deleteMany(),
      testPrisma.user.deleteMany()
    ])
  }
}