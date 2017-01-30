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
const cache = new RSCache([memoryStore, redisStore])
```

## Examples

Check out the [/examples](https://github.com/RisingStack/cache/tree/master/examples) folder.

```sh
cd examples/request
npm install # install dependencies in the example folder
npm start # run the example application
```

## API

### RSCache

`new RSCache([store, ...])` - store order specifies `get` precedency, which means that the cache will try to get the value from stores with lower indexes first

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

- `new RSCache.MemoryStore()`
- `new RSCache.RedisStore(options)`
  - *options*: an Object of [ioredis](https://www.npmjs.com/package/ioredis) options
