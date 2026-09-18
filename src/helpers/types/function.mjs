import { TYPES } from '../../constants.mjs'

export const isFunction = token => {
  if (typeof token !== 'object' || token?.type !== TYPES.function) {
    return false
  }

  return true
}
