/* @flow */

import EventEmitter from 'events'
import Value from './Value'

export default class Cache<K, V> extends EventEmitter {
  stores: Array<Store<K, V>>

  constructor(stores: Array<Store<K, V>>) {
    super()

    if (!Array.isArray(stores) || !stores.length) {
      throw new TypeError('`stores` must be an Array with at least one Store')
    }

    this.stores = stores

    // dummy error listener
    this.on('error', () => {})
  }

  async get(key: K): Promise<?Value<V>> {
    // eslint-disable-next-line no-restricted-syntax
    for (const store of this.stores) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const value = await store.get(key)
        if (value) {
          return value
        }
      } catch (error) {
        this.emitError('Failed to get an item from store', {
          key,
          error
        })
      }
    }

    return undefined
  }

  async set(key: K, value: V, options: TTLOptions): Promise<Array<*>> {
    return Promise.all(this.stores.map((store) => store.set(key, value, options)))
  }

  async delete(key: K): Promise<Array<*>> {
    return Promise.all(this.stores.map((store) => store.delete(key)))
  }

  clear() {
    this.stores.forEach((store) => store.clear())
  }

  async refresh(key: K,
    func: (K | void) => Promise<V> | V | Promise<wrappedValue<V>> | wrappedValue<V>,
    options: TTLOptions): Promise<V> {
    let value = await func(key)
    let cacheOptions = options

    if (value) {
      if (value.value && value.cacheOptions) {
        cacheOptions = value.cacheOptions
        value = value.value
      }

      if (cacheOptions && cacheOptions.expire > 0) {
        // $FlowFixMe: flow fails to recognize as correct param types
        this.stores.forEach((store) => store.set(key, value, cacheOptions))
      }
    }

    return value
  }

  async wrap(key: K, func: Function, options: TTLOptions = {}): Promise<?V> {
    const value = await this.get(key)

    // try to refresh if not in cache or the value is expired
    if (!value || value.isExpired()) {
      try {
        const result = await this.refresh(key, func, options)
        return result
      } catch (ex) {
        // throw error if the value is outdated
        if (!value || (value && value.isStale())) {
          throw ex
        }
        // ignore if stale
        return value.value
      }
    }

    return value.value
  }

  getStats(): StoreStats {
    return this.stores.reduce((stats, store) => {
      const { getCount, hitCount } = store.getStats()
      return {
        getCount: stats.getCount + getCount,
        hitCount: stats.hitCount + hitCount
      }
    }, { getCount: 0, hitCount: 0 })
  }

  resetStats(): StoreStats {
    this.stores.forEach((store) => store.resetStats())
    return this.getStats()
  }

  emitError(message: string, context: { error: Error }) {
    this.emit('error', message, context)
  }
}

type wrappedValue<V> = { value: V, cacheOptions: TTLOptions }
