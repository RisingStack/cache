/* @flow */

import Value from './Value'

export default class Cache<K, V> {
  stores: Array<Store<K, V>>

  constructor(stores: Array<Store<K, V>>) {
    if (!Array.isArray(stores) || !stores.length) {
      throw new TypeError('`stores` must be an Array with at least one Store')
    }

    this.stores = stores
  }

  async get(key: K): Promise<?Value<V>> {
    // eslint-disable-next-line no-restricted-syntax
    for (const store of this.stores) {
      // eslint-disable-next-line no-await-in-loop
      const value = await store.get(key)
      if (value) {
        return value
      }
    }

    return undefined
  }

  async set(key: K, value: V, options: TTLOptions): Promise<Array<*>> {
    return Promise.all(this.stores.map((store) => store.set(key, value, options)))
  }

  clear() {
    this.stores.forEach((store) => store.clear())
  }

  async refresh(key: K, func: (K | void) => Promise<V> | V, options: TTLOptions): Promise<V> {
    const value = await func(key)

    process.nextTick(() => {
      this.stores.forEach((store) => store.set(key, value, options))
    })

    return value
  }

  async wrap(key: K, func: (K | void) => Promise<V> | V, options: TTLOptions): Promise<?V> {
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
}
