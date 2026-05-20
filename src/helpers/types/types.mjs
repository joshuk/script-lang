import { TYPES } from '../../constants.mjs'
import { isBoolean } from './boolean.mjs'
import { isNumber } from './number.mjs'
import { isString } from './string.mjs'

export const getTokenType = token => {
  if (isString(token, false)) {
    return TYPES.string
  }

  if (isBoolean(token)) {
    return TYPES.boolean
  }

  if (isNumber(token)) {
    return TYPES.number
  }

  if (token === 'null') {
    return TYPES.null
  }
}
