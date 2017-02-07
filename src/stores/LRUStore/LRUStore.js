/* @flow */

import LRU from 'lru-cache'
import Value from '../../Value'

type LRUCache<V> = {
  itemCount: number;
  set(key: string, value: V, maxAge: ?number): null;
  get(key: string): V;
  del(key: string): null;
  reset(): null;
}

export default class MemoryStore<V> {
  store: LRUCache<Value<V>>;
  stats: StoreStats;

  constructor(options: number | { max: number }) {
    this.store = LRU(options)
    this.stats = {
      getCount: 0,
      hitCount: 0
    }
  }

  get(key: string): Promise<?Value<V>> {
    const value = this.store.get(key)

    this.stats.getCount += 1
    if (value && (!value.isExpired() || !value.isStale())) {
      this.stats.hitCount += 1
    }

    return Promise.resolve(value)
  }

  set(key: string, value: V, options: TTLOptions = {}): Promise<Value<V>> {
    const val = new Value(value, options)
    this.store.set(key, val, options.expire)
    return Promise.resolve(val)
  }

  delete(key: string): Promise<*> {
    this.store.del(key)
    return Promise.resolve()
  }

  clear() {
    this.store.reset()
  }

  async size(): Promise<number> {
    return Promise.resolve(this.store.itemCount)
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
