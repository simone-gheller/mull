import { createClient } from 'redis'
import { LRUCache } from 'lru-cache'

export class RedisSessionStore {
  constructor(options = {}) {
    this.redisUrl = options.redisUrl || 'redis://localhost:6379'
    this.client = null
    this.connected = false
    this.logger = options.fastifyInstance || console // For logging, default to console if not provided
    
    // LRU Cache configuration
    this.cache = new LRUCache({
      max: options.cacheMax || 1000, // Maximum 1000 sessions in cache
      ttl: options.cacheTtl || 5 * 60 * 1000, // Cache TTL: 5 minutes
      allowStale: false,
      updateAgeOnGet: true,
      updateAgeOnHas: false
    })
    
    this.connect()
  }

  async connect() {
    try {
      this.client = createClient({ url: this.redisUrl })
      this.client.on('error', (err) => this.logger.error('Redis Client Error:', err))
      this.client.on('connect', () => this.logger.info('Redis connected'))
      this.client.on('disconnect', () => {
        this.logger.info('Redis disconnected')
        this.connected = false
      })
      
      await this.client.connect()
      this.connected = true
      this.logger.info('Redis session store connected')
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error)
      this.connected = false
    }
  }

  get(sid, callback) {
    const doGet = async () => {
      try {
        // First check LRU cache
        const cachedSession = this.cache.get(sid)
        if (cachedSession) {
          this.logger.info(`Session ${sid} retrieved from cache`)
          if (callback) callback(null, cachedSession)
          return
        }

        // If not in cache, check Redis
        if (!this.connected || !this.client) {
          this.logger.warn('Redis not connected, cannot retrieve session')
          if (callback) callback(null, null)
          return
        }

        const sessionData = await this.client.get(`session:${sid}`)
        if (!sessionData) {
          if (callback) callback(null, null)
          return
        }

        const parsed = JSON.parse(sessionData)
        
        // Check if session has expired
        if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
          this.destroy(sid, () => {}) // Clean up expired session
          if (callback) callback(null, null)
          return
        }

        // Store in cache for future requests
        this.cache.set(sid, parsed.data)
        this.logger.info(`Session ${sid} retrieved from Redis and cached`)
        
        if (callback) callback(null, parsed.data)
      } catch (error) {
        this.logger.error('Error getting session:', error)
        if (callback) callback(error, null)
      }
    }
    
    doGet()
  }

  set(sid, sessionData, callback) {
    const doSet = async () => {
      try {
        // Default 24 hours TTL
        const defaultTtl = 24 * 60 * 60 * 1000
        const expiresAt = new Date(Date.now() + defaultTtl)
        const redisTtl = Math.floor(defaultTtl / 1000)

        const sessionObject = {
          data: sessionData,
          expiresAt: expiresAt.toISOString()
        }

        // Store in Redis with TTL
        if (this.connected && this.client) {
          await this.client.setEx(`session:${sid}`, redisTtl, JSON.stringify(sessionObject))
          this.logger.info(`Session ${sid} stored in Redis with TTL ${redisTtl}s`)
        } else {
          this.logger.warn('Redis not connected, cannot store session')
        }

        // Update cache
        this.cache.set(sid, sessionData)
        this.logger.info(`Session ${sid} cached`)
        
        if (callback) callback()
      } catch (error) {
        this.logger.error('Error setting session:', error)
        if (callback) callback(error)
      }
    }
    
    doSet()
  }

  destroy(sid, callback) {
    const doDestroy = async () => {
      try {
        // Remove from cache
        this.cache.delete(sid)
        
        // Remove from Redis
        if (this.connected && this.client) {
          await this.client.del(`session:${sid}`)
          this.logger.info(`Session ${sid} destroyed from Redis`)
        }
        
        if (callback) callback()
      } catch (error) {
        this.logger.error('Error destroying session:', error)
        if (callback) callback(error)
      }
    }
    
    doDestroy()
  }

  touch(sid, session, callback) {
    const doTouch = async () => {
      try {
        const redisTtl = 24 * 60 * 60 // 24 hours in seconds

        // Update TTL in Redis
        if (this.connected && this.client) {
          const exists = await this.client.expire(`session:${sid}`, redisTtl)
          if (exists) {
            this.logger.info(`Session ${sid} TTL updated in Redis`)
          }
        }
        
        if (callback) callback()
      } catch (error) {
        this.logger.error('Error touching session:', error)
        if (callback) callback(error)
      }
    }
    
    doTouch()
  }

  clear(callback) {
    const doClear = async () => {
      try {
        // Clear cache
        this.cache.clear()
        
        // Clear all sessions from Redis
        if (this.connected && this.client) {
          const keys = await this.client.keys('session:*')
          if (keys.length > 0) {
            await this.client.del(keys)
            this.logger.info(`Cleared ${keys.length} sessions from Redis`)
          }
        }
        
        if (callback) callback()
      } catch (error) {
        this.logger.error('Error clearing sessions:', error)
        if (callback) callback(error)
      }
    }
    
    doClear()
  }

  length(callback) {
    const doLength = async () => {
      try {
        if (this.connected && this.client) {
          const keys = await this.client.keys('session:*')
          if (callback) callback(null, keys.length)
        } else {
          if (callback) callback(null, 0)
        }
      } catch (error) {
        this.logger.error('Error getting session count:', error)
        if (callback) callback(error, 0)
      }
    }
    
    doLength()
  }

  // Additional methods following connect-redis pattern
  all(callback) {
    const doAll = async () => {
      try {
        if (!this.connected || !this.client) {
          if (callback) callback(null, [])
          return
        }

        const keys = await this.client.keys('session:*')
        const sessions = []
        
        for (const key of keys) {
          const sessionData = await this.client.get(key)
          if (sessionData) {
            try {
              const parsed = JSON.parse(sessionData)
              sessions.push(parsed.data)
            } catch (parseError) {
              this.logger.error('Error parsing session data:', parseError)
            }
          }
        }
        
        if (callback) callback(null, sessions)
      } catch (error) {
        this.logger.error('Error getting all sessions:', error)
        if (callback) callback(error, [])
      }
    }
    
    doAll()
  }

  async disconnect() {
    try {
      if (this.client) {
        await this.client.destroy()
        this.logger.info('Redis session store disconnected')
      }
    } catch (error) {
      this.logger.error('Error disconnecting Redis:', error)
    }
  }
}