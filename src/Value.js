/* @flow */

export default class Value<V> {
  value: V;
  options: TTLOptions;
  createdAt: Date;
  expireAt: Date;
  staleAt: Date;

  constructor(value: V, options: TTLOptions = {}) {
    this.value = value
    this.refresh(options)
  }

  refresh(options: TTLOptions = {}) {
    this.options = options
    const { expire, stale, createdAt = Date.now() } = options
    this.createdAt = new Date(createdAt)

    if (Number.isInteger(expire) && expire !== 0) {
      this.expireAt = new Date(createdAt + expire)
    }

    if (Number.isInteger(stale) && stale !== 0) {
      this.staleAt = new Date(createdAt + stale)
    }
  }

  isExpired(): boolean {
    if (!this.expireAt) {
      return true
    }

    return this.expireAt.valueOf() < Date.now()
  }

  isStale(): boolean {
    if (!this.staleAt) {
      return true
    }

    return this.staleAt.valueOf() < Date.now()
  }

  toJSON(): string {
    return JSON.stringify({
      value: this.value,
      options: Object.assign({
        createdAt: this.createdAt.valueOf(),
        stale: undefined,
        expire: undefined
      }, this.options)
    })
  }

  static fromJSON(json: string): ?Value<V> {
    try {
      const { value, options } = JSON.parse(json)
      if (!options.createdAt) {
        return null
      }

      return new Value(value, options)
    } catch (err) {
      return null
    }
  }
}
