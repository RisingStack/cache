import Value from './Value'

// eslint-disable-next-line no-undef
declare interface Store<K, V> {
  get(key: K): Promise<?Value<V>>;
  set(key: K, value: V, options: TTLOptions): any;
  delete(key: K): any;
  clear(): any;

  getStats(): StoreStats;
  resetStats(): any;
}

declare type TTLOptions = {
  stale?: number;
  expire?: number;
}

declare type StoreStats = {
  getCount: number,
  hitCount: number
}
