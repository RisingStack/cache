'use strict'

const request = require('request-promise-native')
const objectHash = require('node-object-hash')({ alg: 'md5' })
const RSCache = require('../../dist')
const server = require('./server')

const SERVER_PORT = process.env.PORT || 8080

const MemoryStore = RSCache.MemoryStore
const RedisStore = RSCache.RedisStore

const memoryStore = new MemoryStore()
const redisStore = new RedisStore(/* ioredis options */)
const cache = new RSCache([redisStore, memoryStore])

const requestOptions = {
  method: 'GET',
  uri: `http://localhost:${SERVER_PORT}`,
  resolveWithFullResponse: true,
  json: true
}

// start the server
server.listen(SERVER_PORT, (err) => {
  if (err) {
    throw err
  }

  setInterval(() => {
    const key = objectHash.hash(requestOptions)
    cache.wrap(key, makeRequest, { expire: 1000 /* default option */ })
      .then((val) => console.log('value', val))
      .catch((ex) => console.error('error', ex))
  }, 500)

  setInterval(() => {
    console.log('statistics', cache.getStats())
  }, 5000)

  function makeRequest() {
    return request(requestOptions)
      .then((response) => {
        const cacheHeader = response.headers['cache-control']
          .split(';')
          .filter(Boolean) // empty string is falsy
          .reduce((cacheOptions, keyVal) => {
            const [key, val] = keyVal.split('=')
            return Object.assign(cacheOptions, { [key]: val })
          }, {})

        const maxAge = Number(cacheHeader['max-age']) || 0
        const staleIfError = Number(cacheHeader['stale-if-error']) || 0

        let cacheOptions
        if (maxAge || staleIfError) {
          cacheOptions = {
            stale: staleIfError ? maxAge * 1000 : undefined,
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
