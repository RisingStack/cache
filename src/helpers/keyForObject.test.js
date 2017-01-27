import keyForObject from './keyForObject'

describe('helpers.keyForObject', () => {
  it('should return the same string independent of the order of the keys', () => {
    const key1 = keyForObject({ a: 1, b: 2, c: { d: {}, e: 'f', g: [1, 2, 3] } })
    const key2 = keyForObject({ b: 2, c: { e: 'f', d: {}, g: [3, 2, 1] }, a: 1 })
    expect(key1).toEqual(key2)
  })
})
