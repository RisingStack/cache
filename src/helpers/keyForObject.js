import util from 'util'
import isPlainObject from 'lodash.isplainobject'

export default function keyForObject(obj: Object): string {
  return util.inspect(sortKeys(obj), { showHidden: true, depth: null })
}

function sortKeys(obj: Object = {}): Object {
  return Object.keys(obj)
    .sort()
    .reduce((sorted, key) => {
      let value = obj[key]

      if (isPlainObject(value)) {
        value = sortKeys(value)
      } else if (Array.isArray(value)) {
        value = value.sort()
      }

      return {
        ...sorted,
        [key]: value
      }
    }, Object.create(null))
}
