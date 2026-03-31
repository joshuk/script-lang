import { areItemsInArray } from '../helpers/array.mjs'
import { getBooleanValue, isBoolean } from '../helpers/types/boolean.mjs'
import { isNumber } from '../helpers/types/number.mjs'
import { getStringValue, isString } from '../helpers/types/string.mjs'
import Arithmetic from './arithmetic.mjs'
import Strings from './strings.mjs'
import Variables from './variables.mjs'

class Logic {
  constructor() {
    this.variables = new Variables(this)
    this.arithmetic = new Arithmetic(this)
    this.strings = new Strings(this)

    this.operators = [...this.arithmetic.operators, this.strings.operator]
  }

  getTokenValue(token) {
    if (token === 'null') {
      return {
        type: null,
        value: null,
      }
    }

    if (isNumber(token)) {
      return {
        type: 'number',
        value: Number(token),
      }
    }

    if (isString(token)) {
      return {
        type: 'string',
        value: getStringValue(token),
      }
    }

    if (isBoolean(token)) {
      return {
        type: 'boolean',
        value: getBooleanValue(token),
      }
    }

    if (this.variables.isVariable(token)) {
      return this.variables.getVariable(token)
    }

    return false
  }

  // This is based on some shit by ChatGPT. I'm not proud of it, but
  // I've been pissing around with it for ages and I can't sort it out.
  // Whatever.
  getTokens(string) {
    const stack = [[]]
    let buffer = ''
    let level = 0

    const pushToStack = item => {
      if (typeof item === 'string' && item.trim() === '') {
        return
      }

      stack[stack.length - 1].push(item)
    }

    for (let i = 0; i < string.length; i++) {
      const char = string[i]

      if (char === '(') {
        if (buffer) {
          pushToStack(buffer)
          buffer = ''
        }

        const newGroup = []
        pushToStack(newGroup)
        stack.push(newGroup)
        level += 1
      } else if (char === ')') {
        if (level === 0) {
          throw getError('Unexpected )', i)
        }

        if (buffer) {
          pushToStack(buffer)
          buffer = ''
        }

        stack.pop()
        level -= 1
      } else if (this.operators.includes(char)) {
        if (buffer !== '') {
          pushToStack(buffer)
          buffer = ''
        }

        pushToStack(char)
      } else {
        buffer += char
      }
    }

    if (buffer) {
      stack[0].push(buffer)
    }

    return stack[0]
  }

  cleanTokens(tokens) {
    let output = []

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]

      if (Array.isArray(token)) {
        output.push(this.cleanTokens(token))

        continue
      }

      output.push(token)
    }

    output = this.arithmetic.combineDecimals(output)
    output = this.arithmetic.combineNegativeNumbers(output)

    output = this.strings.combineStrings(output)

    output = output.map(token =>
      typeof token === 'string' ? token.trim() : token
    )

    if (output.length === 1 && Array.isArray(output[0])) {
      return output[0]
    }

    return output
  }

  getFirstTokenType(token) {
    if (Array.isArray(token)) {
      return this.getFirstTokenType(token[0])
    }

    const tokenValue = this.getTokenValue(token)

    return tokenValue.type
  }

  evaluateTokens(tokens) {
    if (tokens.includes(this.strings.operator)) {
      const result = this.strings.getConcatenationResult(tokens)

      return {
        type: 'number',
        value: result,
      }
    }

    if (areItemsInArray(tokens, this.arithmetic.operators)) {
      const result = this.arithmetic.calculateArithmetic(tokens)

      return {
        type: 'number',
        value: result,
      }
    }

    throw new Error('Unknown expression')
  }

  getExpressionValue(expression) {
    const tokens = this.getTokens(expression)
    const cleanedTokens = this.cleanTokens(tokens)

    if (cleanedTokens.length === 1) {
      const tokenValue = this.getTokenValue(cleanedTokens[0])

      if (tokenValue) {
        return tokenValue
      }
    }

    const result = this.evaluateTokens(cleanedTokens)

    return result
  }
}

export default Logic
