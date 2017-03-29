# @risingstack/cache

Stale / Expire cache implementation.

[![CircleCI](https://circleci.com/gh/RisingStack/cache.svg?style=svg)](https://circleci.com/gh/RisingStack/cache)
[![Known Vulnerabilities](https://snyk.io/test/npm/@risingstack/cache/badge.svg)](https://snyk.io/test/npm/@risingstack/cache)

## Getting Started

```sh
npm install --save @risingstack/cache
```

```sh
yarn add @risingstack/cache
```

RSCache assumes Node version 4 or above.

To get started create an `RSCache` instance.

```js
const RSCache = require('@risingstack/cache')

const memoryStore = new RSCache.MemoryStore()
const redisStore = new RSCache.RedisStore(/* ioredis options */)
const cache = new RSCache([memoryStore, redisStore], {
  timeout: 200
})
```

**Wrap:**

Wrap Promise into cache.

```js
cache.wrap('key', () => Promise.resolve({
  value: { foo: 'bar' },
  cacheOptions: {
    stale: 50,   // stale is optional: refresh after stale
    expire: 100  // expire is required: only used when fn fails (0 removed from cache, undefined skips cache)
  }
}))
.then((value) => {
  console.log(value) // { foo: 'bar' }
})
```

or with global cache options, just:

```js
cache.wrap('key', () => Promise.resolve({ foo: 'bar' }))
.then((value) => {
  console.log(value) // { foo: 'bar' }
}, {
  stale: 50,
  expire: 100
})
```

or with both. With both local and global cache options, the two objects are merged and local has higher priority.

**stale:** optional: refresh after stale, time until value can be used from cache
**expire:** required: time until value can be used from cache if fn fails

`0 <= stale < expire`

*Some examples:*

- `{ expire: 24 * 60 * 1000 }`: use cache only at error
- `{ expire: 24 * 60 * 1000, stale: 60 * 1000 }`: use from cache until stale, use until expire at error

## Examples

Check out the [/examples](https://github.com/RisingStack/cache/tree/master/examples) folder.

```sh
cd examples/request
npm install # install dependencies in the example folder
npm start # run the example application
```

## API

### RSCache

`new RSCache([store, ...], options)` - store order specifies `get` precedency, which means that the cache will try to get the value from stores with lower indexes first

- `options`: optional
  - `timeout`: optional, Number in milliseconds, maximum time that cache waits for get

- `get(key)`: get the value for the key or `undefined` if not found
- `set(key, value, options)`: sets the value
  - *options*: an Object of options:
    - *expire*: expiration time in `ms`
    - *stale*: stale time in `ms`
- `delete(key)`: delete a value for the key
- `clear()`: remove all values
- `wrap(key, func, options)`: wrap a function with cache
  - *func*: a Function returning a `Promise` of value or Object of `{ value, cacheOptions }`
    - *cacheOptions*: an Object of options:
      - *expire*: expiration time in `ms`
      - *stale*: stale time in `ms`
  - *options*: an Object of default options:
    - *expire*: expiration time in `ms`
    - *stale*: stale time in `ms`
- `getStats()`: get and hit count
- `resetStats()`: reset the statistics

### Stores

- `get(key)`: get the value for the key or `undefined` if not found
- `set(key, value, options)`: sets the value
  - *options*: an Object of options:
    - *expire*: expiration time in `ms`
    - *stale*: stale time in `ms`
- `delete(key)`: delete a value for the key
- `clear()`: remove all values
- `size()`: size of the store
- `getStats()`: get and hit count
- `resetStats()`: reset the statistics

#### Implementations

- `new RSCache.LRUStore(options)` - uses LRU cache
  - *options*: an Object of [lru-cache](https://www.npmjs.com/package/lru-cache) options
- `new RSCache.MemoryStore()` - uses simple `Map`
- `new RSCache.RedisStore(options)`
  - *options*: an Object of [ioredis](https://www.npmjs.com/package/ioredis) options

## Stale if error

### No cache

Skip cache, useful at 404 status code issue for example.

```js
const error = new Error('error')
error.noCache = true
```
