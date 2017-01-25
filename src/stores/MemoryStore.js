/* @flow */

import Value from '../Value'

export default class MemoryStore<V> {
  store: Map<string, Value<V>>;
  stats: StoreStats;

  constructor() {
    this.store = new Map()
    this.stats = {
      getCount: 0,
      hitCount: 0
    }
  }

  get(key: string): Promise<?Value<V>> {
    const value = this.store.get(key)

    this.stats.getCount += 1
    if (value) {
      this.stats.hitCount += 1
    }

    return Promise.resolve(value)
  }

  set(key: string, value: V, options: TTLOptions): Promise<Value<V>> {
    const val = new Value(value, options)
    this.store.set(key, val)
    return Promise.resolve(val)
  }

  delete(key: string): Promise<*> {
    this.store.delete(key)
    return Promise.resolve()
  }

  clear() {
    this.store.clear()
  }

  async size(): Promise<number> {
    return Promise.resolve(this.store.size)
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
}
