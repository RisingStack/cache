import RedisStore from './RedisStore'
import Value from '../../Value'

describe('RedisStore', () => {
  let store

  beforeAll(() => {
    store = new RedisStore()
  })

  afterEach(async () => {
    await store.clear()
    store.resetStats()
  })

  afterAll(() => {
    store.client.disconnect()
  })

  describe('.get()', () => {
    it('should return a Promise', async () => {
      let value = await store.get('notexisting')
      expect(value).toBeUndefined()

      const item = { val: 1 }
      store.set('existing', item)

      value = await store.get('existing')
      expect(value).toBeInstanceOf(Value)
      expect(value).toMatchObject({ value: item })
    })
  })

  describe('.set()', () => {
    it('should set a value with ttl options', async () => {
      const item = { val: 1 }
      const options = { stale: 5, expire: 100000 }
      store.set('key', item, options)

      const value = await store.get('key')
      expect(value).toMatchObject({
        options,
        value: item
      })
    })
  })

  describe('.delete()', () => {
    it('should delete an item', async () => {
      const item = { val: 1 }
      store.set('key', item)

      let value = await store.get('key')
      expect(value).toBeDefined()

      store.delete('key')

      value = await store.get('key')
      expect(value).toBeUndefined()
    })
  })

  describe('.clear()', () => {
    it('should clear the store', async () => {
      const item = { val: 1 }
      store.set('key', item)

      let value = await store.get('key')
      expect(value).toBeDefined()

      store.clear()

      value = await store.get('key')
      expect(value).toBeUndefined()
    })
  })

  describe('.size()', () => {
    it('should return the size of the store', async () => {
      let size = await store.size()
      expect(size).toEqual(0)

      store.set('key', { val: 1 })
      store.set('key2', { val: 1 })

      size = await store.size()
      expect(size).toEqual(2)

      store.delete('key')

      size = await store.size()
      expect(size).toEqual(1)
    })
  })

  describe('.getStats()', () => {
    it('should return hit stats', async () => {
      store.set('existing', { val: 1 })

      await store.get('notexisting')
      await store.get('notexisting')
      await store.get('existing')
      await store.get('notexisting')
      await store.get('existing')

      const stats = store.getStats()
      expect(stats).toEqual({
        getCount: 5,
        hitCount: 2
      })
    })
  })

  describe('.resetStats()', () => {
    it('should reset the hit stats', async () => {
      store.set('existing', { val: 1 })

      await store.get('notexisting')
      await store.get('notexisting')
      await store.get('existing')
      await store.get('notexisting')
      await store.get('existing')

      store.resetStats()

      let stats = store.getStats()
      expect(stats).toEqual({
        getCount: 0,
        hitCount: 0
      })

      await store.get('notexisting')
      await store.get('existing')

      stats = store.getStats()
      expect(stats).toEqual({
        getCount: 2,
        hitCount: 1
      })
    })
  })
})
