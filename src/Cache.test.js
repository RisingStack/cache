import MockDate from 'mockdate'
import Cache from './Cache'
import Value from './Value'
import MemoryStore from './stores/MemoryStore'

describe('Cache', () => {
  let stores
  let cache

  beforeAll(() => {
    MockDate.set('2000-01-01T00:00:00Z')
  })

  afterAll(() => {
    MockDate.reset()
  })

  beforeEach(() => {
    stores = [new MemoryStore(), new MemoryStore()]
    cache = new Cache(stores)

    jest.useFakeTimers()
  })

  afterEach(() => {
    cache.clear()
  })

  it('should throw an error if constructed with no stores', () => {
    const error = new TypeError('`stores` must be an Array with at least one Store')
    expect(() => new Cache()).toThrowError(error)
    expect(() => new Cache([])).toThrowError(error)
    expect(() => new Cache(new MemoryStore())).toThrowError(error)
  })

  describe('.get()', () => {
    it('should return a Promise<Value>', async () => {
      let value = await cache.get('key')
      expect(value).toBeUndefined()

      const item = { val: 1 }
      cache.set('key', item)

      value = await cache.get('key')
      expect(value).toBeInstanceOf(Value)
      expect(value).toMatchObject({ value: item })

      expect(cache).toMatchSnapshot()
    })

    it('should not return a value if timeouts', async () => {
      const GET_TIMEOUT = 5
      const GET_DELAY = 10

      cache = new Cache([stores[0]], {
        timeout: GET_TIMEOUT
      })

      const val = { val: 1 }
      cache.set('key', val)

      stores[0].get = () => new Promise((resolve) => {
        setTimeout(() => resolve(val), GET_DELAY)
      })

      const valuePromise = cache.get('key')
      jest.runTimersToTime(GET_DELAY)
      const value = await valuePromise

      expect(value).toBeUndefined()
      expect(cache).toMatchSnapshot()
    })

    it('should check for the value in every store', async () => {
      expect(cache).toMatchSnapshot()
      expect(stores.map((store) => store.getStats())).toEqual([{
        getCount: 0,
        hitCount: 0
      }, {
        getCount: 0,
        hitCount: 0
      }])

      await cache.get('key')

      expect(cache).toMatchSnapshot()
      expect(stores.map((store) => store.getStats())).toEqual([{
        getCount: 1,
        hitCount: 0
      }, {
        getCount: 1,
        hitCount: 0
      }])

      stores[1].set('key', { val: 1 }, { expire: 100 })

      await cache.get('key')

      expect(cache).toMatchSnapshot()
      expect(stores.map((store) => store.getStats())).toEqual([{
        getCount: 2,
        hitCount: 0
      }, {
        getCount: 2,
        hitCount: 1
      }])
    })

    it('should emit an error when a store fails to get an item', async () => {
      const error = new Error('internal error')
      stores[0].get = () => Promise.reject(error)
      cache.emit = jest.fn()

      const key = 'key'
      await cache.get(key)

      expect(cache.emit).toHaveBeenCalledWith('error', 'Failed to get an item from store', {
        key,
        error
      })
    })

    it('should emit an error when a store has an error', async () => {
      class MemoryStoreWithErrorHandler extends MemoryStore {
        constructor(...args) {
          super(...args)

          this.errorHandlers = new Set()
        }

        registerErrorHandler(errorHandler) {
          this.errorHandlers.add(errorHandler)
        }

        emitError(message, context) {
          this.errorHandlers.forEach((errorHandler) => errorHandler(message, context))
        }
      }

      const memoryStore = new MemoryStoreWithErrorHandler()
      cache = new Cache([memoryStore])
      cache.emit = jest.fn()

      const error = new Error('Such Error')
      memoryStore.emitError(error.message, { error: Error })
      expect(cache.emit).toHaveBeenCalledWith('error', error.message, { error: Error })
    })
  })

  describe('.set()', () => {
    it('should set the value in every store', async () => {
      const item = { val: 1 }
      const options = { expire: 10, stale: 5 }
      cache.set('key', item, options)

      const values = await Promise.all(stores.map((store) => store.get('key')))
      expect(values[0]).toBeInstanceOf(Value)
      expect(values[0]).toMatchObject({ options, value: item })
      expect(values[1]).toBeInstanceOf(Value)
      expect(values[1]).toMatchObject({ options, value: item })
    })
  })

  describe('.clear()', () => {
    it('should clear all the stores', async () => {
      cache.set('key', { val: 1 })
      let sizes = await Promise.all(stores.map((store) => store.size()))
      expect(sizes).toEqual([1, 1])

      cache.clear()

      sizes = await Promise.all(stores.map((store) => store.size()))
      expect(sizes).toEqual([0, 0])
    })
  })

  describe('.refresh()', () => {
    describe('with raw value input', () => {
      it('should refresh the cache with the returned value', async () => {
        const value = { foo: 'bar' }
        const options = { expire: 10, stale: 5 }
        const wrappedFunction = jest.fn(() => Promise.resolve(value))

        const result = await cache.refresh('key', wrappedFunction, options)
        expect(result).toEqual(value)
        jest.runAllTicks()

        const values = await Promise.all(stores.map((store) => store.get('key')))
        expect(values[0]).toMatchObject({ options, value })
        expect(values[1]).toMatchObject({ options, value })

        expect(cache).toMatchSnapshot()
      })

      it('should use stale as expire if undefined', async () => {
        const value = { foo: 'bar' }
        const options = { stale: 5 }
        const wrappedFunction = jest.fn(() => Promise.resolve(value))

        const result = await cache.refresh('key', wrappedFunction, options)
        expect(result).toEqual(value)
        jest.runAllTicks()

        const values = await Promise.all(stores.map((store) => store.get('key')))
        const finalOptions = { expire: 5, stale: 5 }
        expect(values[0]).toMatchObject({ options: finalOptions, value })
        expect(values[1]).toMatchObject({ options: finalOptions, value })

        expect(cache).toMatchSnapshot()
      })

      it('should skip cache with undefined stale and expire', async () => {
        const value = { foo: 'bar' }
        const options = {}
        const wrappedFunction = jest.fn(() => Promise.resolve(value))

        const result = await cache.refresh('key', wrappedFunction, options)
        expect(result).toEqual(value)
        jest.runAllTicks()

        const values = await Promise.all(stores.map((store) => store.get('key')))
        expect(values[0]).toBeUndefined()
        expect(values[1]).toBeUndefined()

        expect(cache).toMatchSnapshot()
      })

      it('should set cache to zero with 0 expire', async () => {
        const value = { foo: 'bar' }
        const wrappedFunction = jest.fn(() => Promise.resolve(value))

        let result = await cache.refresh('key', wrappedFunction, { expire: 100 })
        jest.runAllTicks()
        expect(result).toEqual(value)

        let values = await Promise.all(stores.map((store) => store.get('key')))
        expect(values[0]).toMatchObject({ options: { expire: 100 }, value })
        expect(values[1]).toMatchObject({ options: { expire: 100 }, value })

        result = await cache.refresh('key', wrappedFunction, { expire: 0 })
        jest.runAllTicks()
        expect(result).toEqual(value)

        values = await Promise.all(stores.map((store) => store.get('key')))
        expect(values[0]).toMatchObject({ options: { expire: 0 }, value })
        expect(values[1]).toMatchObject({ options: { expire: 0 }, value })

        expect(cache).toMatchSnapshot()
      })
    })

    describe('with object input { cacheOptions, value }', () => {
      it('should refresh the cache with cache options', async () => {
        const value = { foo: 'bar' }
        const item = { value, cacheOptions: { stale: 1 } }
        const options = { expire: 10, stale: 5 }
        const wrappedFunction = jest.fn(() => Promise.resolve(item))

        const result = await cache.refresh('key', wrappedFunction, options)
        expect(result).toEqual(value)
        jest.runAllTicks()

        const values = await Promise.all(stores.map((store) => store.get('key')))
        const mergedOptions = { expire: 10, stale: 1 }
        expect(values[0]).toMatchObject({ options: mergedOptions, value })
        expect(values[1]).toMatchObject({ options: mergedOptions, value })

        expect(cache).toMatchSnapshot()
      })
    })
  })

  describe('.wrap', () => {
    it('should return the value if it is in the cache', async () => {
      const item = { val: 1 }
      const wrappedFunction = jest.fn(() => Promise.resolve(item))

      cache.set('key', item, { expire: 100, stale: 100 })

      const result = await cache.wrap('key', wrappedFunction)
      expect(result).toEqual(item)
      expect(wrappedFunction).not.toHaveBeenCalled()
    })

    it('should return the value if it was cached', async () => {
      const value = { foo: 'bar' }
      const wrappedFunction = jest.fn()
        .mockImplementationOnce(() => Promise.resolve({ value, cacheOptions: { stale: 10, expire: 100 } }))

      const result1 = await cache.wrap('key', wrappedFunction)
      const result2 = await cache.wrap('key', wrappedFunction)
      expect(result1).toEqual(value)
      expect(result2).toEqual(value)
      // second call comes from stale cache
      expect(wrappedFunction).toHaveBeenCalledTimes(1)
    })

    it('should return the value if it is expire only but fn fails', async () => {
      const value = { foo: 'bar' }
      const wrappedFunction = jest.fn()
        .mockImplementationOnce(() => Promise.resolve({ value, cacheOptions: { expire: 100 } }))
        .mockImplementationOnce(() => Promise.reject(new Error('My Error')))

      const result1 = await cache.wrap('key', wrappedFunction)
      const result2 = await cache.wrap('key', wrappedFunction)
      expect(result1).toEqual(value)
      expect(result2).toEqual(value)
      expect(wrappedFunction).toHaveBeenCalledTimes(2)
    })

    it('should refresh the value if it is expire only and provide the latest', async () => {
      const value1 = { foo: 'bar1' }
      const value2 = { foo: 'bar2' }
      const wrappedFunction = jest.fn()
        .mockImplementationOnce(() => Promise.resolve({ value: value1, cacheOptions: { expire: 100 } }))
        .mockImplementationOnce(() => Promise.resolve({ value: value2, cacheOptions: { expire: 100 } }))

      const result1 = await cache.wrap('key', wrappedFunction)
      const result2 = await cache.wrap('key', wrappedFunction)
      expect(result1).toEqual(value1)
      expect(result2).toEqual(value2)
      expect(wrappedFunction).toHaveBeenCalledTimes(2)
    })

    it('should refresh the value if it is not in the cache', async () => {
      const item = { val: 1 }
      const wrappedFunction = jest.fn(() => Promise.resolve(item))

      expect(cache).toMatchSnapshot()

      const result = await cache.wrap('key', wrappedFunction)
      expect(result).toEqual(item)
      expect(wrappedFunction).toHaveBeenCalled()

      jest.runAllTicks()

      expect(cache).toMatchSnapshot()
    })

    it('should refresh the value if it is not in the cache (with cacheOptions)', async () => {
      const item = { val: 1 }
      const wrappedFunction = jest.fn(() => Promise.resolve({ value: item, cacheOptions: { expire: 10, stale: 5 } }))

      expect(cache).toMatchSnapshot()

      const result = await cache.wrap('key', wrappedFunction)
      expect(result).toEqual(item)
      expect(wrappedFunction).toHaveBeenCalled()

      jest.runAllTicks()

      expect(cache).toMatchSnapshot()
    })

    it('should refresh the value if it is expired in the cache (with cacheOptions)', async () => {
      const item = { val: 1 }
      const wrappedFunction = jest.fn(() => Promise.resolve({
        value: null, cacheOptions: { expire: 10, stale: 5 } }
      ))
      cache.set('key', item)
      const value = await cache.get('key')
      value.isExpired = () => true

      expect(cache).toMatchSnapshot()

      const result = await cache.wrap('key', wrappedFunction)
      expect(result).toEqual(null)
      expect(wrappedFunction).toHaveBeenCalled()

      jest.runAllTicks()

      expect(cache).toMatchSnapshot()
    })

    it('should refresh the value if it is expired', async () => {
      const item = { val: 1 }
      const wrappedFunction = jest.fn(() => Promise.resolve(item))
      cache.set('key', item)
      const value = await cache.get('key')
      value.isExpired = () => true

      expect(cache).toMatchSnapshot()

      const result = await cache.wrap('key', wrappedFunction)
      expect(result).toEqual(item)
      expect(wrappedFunction).toHaveBeenCalled()

      jest.runAllTicks()

      expect(cache).toMatchSnapshot()
    })

    it('should return the value if it is stale but not expired yet and the wrapped function fails', async () => {
      const item = { val: 1 }
      const wrappedFunction = jest.fn(() => Promise.reject(new Error('error')))
      cache.set('key', item)
      const value = await cache.get('key')
      value.isExpired = () => false
      value.isStale = () => true

      expect(cache).toMatchSnapshot()

      const result = await cache.wrap('key', wrappedFunction)
      expect(result).toEqual(item)
      expect(wrappedFunction).toHaveBeenCalled()

      jest.runAllTicks()

      expect(cache).toMatchSnapshot()
    })

    it('should throw an error if error has a noCache=true', async () => {
      const item = { val: 1 }
      const error = new Error('error')
      error.noCache = true
      const wrappedFunction = jest.fn(() => Promise.reject(error))
      cache.set('key', item)
      const value = await cache.get('key')
      value.isExpired = () => false
      value.isStale = () => true

      let ex
      try {
        await cache.wrap('key', wrappedFunction)
      } catch (err) {
        ex = err
      }

      expect(ex).toMatchSnapshot()
    })

    it('should throw an error if the item is not in cache and the wrapped function fails', async () => {
      const error = new Error('error')
      const wrappedFunction = jest.fn(() => Promise.reject(error))

      let ex
      try {
        await cache.wrap('key', wrappedFunction)
      } catch (err) {
        ex = err
      }

      expect(ex).toMatchSnapshot()
    })

    it('should throw an error if the value in cache is expired and stale and the wrapped function fails', async () => {
      const error = new Error('error')
      const wrappedFunction = jest.fn(() => Promise.reject(error))
      cache.set('key', { val: 1 })
      const value = await cache.get('key')
      value.isExpired = () => true
      value.isStale = () => true

      let ex
      try {
        await cache.wrap('key', wrappedFunction)
      } catch (err) {
        ex = err
      }

      expect(ex).toMatchSnapshot()
    })
  })
})
