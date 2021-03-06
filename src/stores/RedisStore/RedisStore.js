/* @flow */

import Redis from 'ioredis'
import Value from '../../Value'

interface ErrorHandler {
  (message: string, context: { error: Error }): void;
}

export default class RedisStore<V> {
  client: Object;
  stats: StoreStats;
  errorHandlers: Set<ErrorHandler>;

  constructor(options: Object | string) {
    this.client = new Redis(options)
    this.stats = {
      getCount: 0,
      hitCount: 0
    }
    this.errorHandlers = new Set()

    this.client.on('error', (error) =>
      this.emitError('Redis store', { error })
    )
  }

  registerErrorHandler(errorHandler: ErrorHandler) {
    this.errorHandlers.add(errorHandler)
  }

  async get(key: string): Promise<?Value<V>> {
    const value = await this.client.get(key)

    this.stats.getCount += 1
    if (value) {
      this.stats.hitCount += 1
      return Value.fromJSON(value)
    }

    return undefined
  }

  async set(key: string, value: V, options: TTLOptions = {}): Promise<Value<V>> {
    const val = new Value(value, options)

    if (options.expire) {
      await this.client.setex(key, Math.ceil(options.expire / 1000), val.toJSON())
    } else {
      await this.client.set(key, val.toJSON())
    }

    return val
  }

  async delete(key: string): Promise<*> {
    await this.client.del(key)
  }

  clear() {
    return this.client.flushall()
  }

  async size(): Promise<number> {
    const size = await this.client.dbsize()
    return size
  }

  getStats(): StoreStats {
    return this.stats
  }

  resetStats(): StoreStats {
    this.stats = {
      getCount: 0,
      hitCount: 0
    }

    return this.getStats()
  }

  emitError(message: string, context: { error: Error }) {
    this.errorHandlers.forEach((errorHandler) => errorHandler(message, context))
  }
}
