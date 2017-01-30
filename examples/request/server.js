'use strict'

const http = require('http')

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-control': 'max-age=2;stale-if-error=5;'
  })
  res.write(JSON.stringify({ key: Math.floor(Math.random() * 100) }))
  res.end()
})

module.exports = server
