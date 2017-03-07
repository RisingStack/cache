class PromiseTimeoutError extends Error {
  constructor(...args) {
    super(...args)
    this.code = 'ETIMEDOUT'
  }
}

function promiseTimeout(originalPromise: Promise, timeout: Number) {
  if (!originalPromise) {
    throw new TypeError('originalPromise is required')
  }

  if (typeof timeout !== 'number') {
    throw new TypeError('timeout is required to be a number')
  }

  return Promise.race([
    // MDN: Generally, if you want to know if a value is a promise or not
    // Promise.resolve(value) it instead and work with the return value as a promise.
    Promise.resolve(originalPromise),
    new Promise((resolve, reject) => {
      setTimeout(() => {
        const err = new PromiseTimeoutError('Timed out')
        reject(err)
      }, timeout)
    })
  ])
}

export default {
  promiseTimeout,
  PromiseTimeoutError
}
