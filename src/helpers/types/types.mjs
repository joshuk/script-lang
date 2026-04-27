import { TYPES } from '../../constants.mjs'
import { isBoolean } from './boolean.mjs'
import { isNumber } from './number.mjs'
import { isString } from './string.mjs'

export const getTokenType = token => {
  if (isString(token, false)) {
    return TYPES.string
  }

  if (isNumber(token)) {
    return TYPES.number
  }

  if (isBoolean(token)) {
    return TYPES.boolean
  }

  if (token === 'null') {
    return TYPES.null
  }
}
