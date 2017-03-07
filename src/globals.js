import Value from './Value'

// eslint-disable-next-line no-undef
declare interface Store<K, V> {
  get(key: K): Promise<?Value<V>>;
  set(key: K, value: V, options: TTLOptions): Promise<Value<V>>;
  delete(key: K): Promise<*>;
  clear(): any;
  size(): Promise<number>;
  registerErrorHandler?: (ErrorHandler) => void;

  getStats(): StoreStats;
  resetStats(): StoreStats;
}

declare interface ErrorHandler {
  (message: string, context: { error: Error }): void;
}

declare type TTLOptions = {
  stale?: number;
  expire?: number;
}

declare type StoreStats = {
  getCount: number,
  hitCount: number
}
