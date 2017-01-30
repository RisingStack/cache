'use strict'

const http = require('http')
const request = require('request-promise-native')
const objectHash = require('node-object-hash')({ alg: 'md5' })
const RSCache = require('../../dist')

const SERVER_PORT = process.env.PORT || 8080

const memoryStore = new RSCache.MemoryStore()
const redisStore = new RSCache.RedisStore(/* ioredis options */)
// create a cache with memory and redis stores
// on .get we will hit the memory store first
const cache = new RSCache([memoryStore, redisStore])

const server = http.createServer((req, res) => {
  // set the max age to 2 seconds and stale if error to 5 seconds
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-control': 'max-age=2;stale-if-error=5;'
  })
  res.write(JSON.stringify({ key: Math.floor(Math.random() * 100) }))
  res.end()
})

// start the server
server.listen(SERVER_PORT, (err) => {
  if (err) {
    throw err
  }

  // we will call the server we just started
  const requestOptions = {
    method: 'GET',
    uri: `http://localhost:${SERVER_PORT}`,
    resolveWithFullResponse: true,
    json: true
  }

  // get the value every half seconds
  setInterval(() => {
    // generate the key from the request options
    const key = objectHash.hash(requestOptions)
    // wrap the makeRequest function
    cache.wrap(key, makeRequest, { expire: 1000 /* default option */ })
      .then((val) => console.log('value', val))
      .catch((ex) => console.error('error', ex))
  }, 500)

  // get the cache statistics every 5 seconds
  setInterval(() => {
    console.log('statistics', cache.getStats())
  }, 5000)

  function makeRequest() {
    return request(requestOptions)
      .then((response) => {
        // parse the cache headers
        const cacheHeader = response.headers['cache-control']
          .split(';')
          .filter(Boolean) // empty string is falsy
          .reduce((cacheOptions, keyVal) => {
            const [key, val] = keyVal.split('=')
            return Object.assign(cacheOptions, { [key]: val })
          }, {})

        const maxAge = Number(cacheHeader['max-age']) || 0
        const staleIfError = Number(cacheHeader['stale-if-error']) || 0

        // overried the default ttl options
        let cacheOptions
        if (maxAge || staleIfError) {
          // now < stale < expire
          cacheOptions = {
            // until the max age time the value is up to date
            stale: staleIfError ? maxAge * 1000 : undefined,
            // try to refresh the value when it's stale but not yet expired
            // on error we can still use the stored value
            expire: staleIfError ? staleIfError * 1000 : maxAge * 1000
          }
        }

        return {
          cacheOptions,
          value: response.body
        }
      })
  }
})
