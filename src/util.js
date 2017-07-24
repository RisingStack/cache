/* @flow */

export class PromiseTimeoutError extends Error {
  code: string;

  constructor(message: string) {
    super(message)
    this.code = 'ETIMEDOUT'
  }
}

export function promiseTimeout(originalPromise: Promise<any>, timeout: number): Promise<any> {
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

