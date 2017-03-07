import { promiseTimeout } from './util'

describe('util: promiseTimeout', () => {
  let originalPromise

  beforeEach(() => {
    originalPromise = new Promise((resolve) => {
      setTimeout(() => resolve('foo'), 5)
    })
  })

  it('should reject with timeout', async () => {
    try {
      await promiseTimeout(originalPromise, 0)
    } catch (error) {
      expect(error.code).toEqual('ETIMEDOUT')
      return
    }

    throw new Error('Did not throw error')
  })

  it('should accept with within timeout period', async () => {
    const data = await promiseTimeout(originalPromise, 10)
    expect(data).toEqual('foo')
  })
})
