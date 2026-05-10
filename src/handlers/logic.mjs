import { GLOBAL_SCOPE, TYPES } from '../constants.mjs'
import { areItemsInArray, last } from '../helpers/array.mjs'
import { getError } from '../helpers/errors.mjs'
import { getBooleanValue, isBoolean } from '../helpers/types/boolean.mjs'
import { isFunction } from '../helpers/types/function.mjs'
import { isNumber } from '../helpers/types/number.mjs'
import { getStringValue, isString } from '../helpers/types/string.mjs'
import Arithmetic from './arithmetic.mjs'
import Boolean from './boolean.mjs'
import Functions from './functions.mjs'
import Strings from './strings.mjs'
import Variables from './variables.mjs'

class Logic {
  constructor(parser) {
    this.parser = parser
    this.variables = new Variables(this)
    this.arithmetic = new Arithmetic(this)
    this.strings = new Strings(this)
    this.boolean = new Boolean(this)
    this.functions = new Functions(this)

    this.operators = [
      ...this.arithmetic.operators,
      this.strings.operator,
      ...this.boolean.operators,
      ...this.functions.operators,
    ]

    this.visibleScopes = [GLOBAL_SCOPE]
  }

  getCurrentScope() {
    return last([...this.visibleScopes])
  }

  getTokenValue(token) {
    if (token === 'null') {
      return {
        type: TYPES.null,
        value: null,
      }
    }

    if (isFunction(token)) {
      return this.functions.getFunctionResult(token)
    }

    if (isNumber(token)) {
      return {
        type: TYPES.number,
        value: Number(token),
      }
    }

    if (isString(token)) {
      return {
        type: TYPES.string,
        value: getStringValue(token),
      }
    }

    if (isBoolean(token)) {
      return {
        type: TYPES.boolean,
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

    let isInString = false
    let quoteCharacter = null

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
      } else if (char === ')' && !isInString) {
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
        if (['"', "'"].includes(char)) {
          if (!isInString && string[i - 1] !== '\\') {
            isInString = true
            quoteCharacter = char
          } else if (
            isInString &&
            quoteCharacter === char &&
            string[i - 1] !== '\\'
          ) {
            isInString = false
            quoteCharacter = null
          }
        }

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

    output = this.boolean.combineOperators(output)
    output = this.boolean.containBooleanEquations(output)

    output = this.functions.formatFunctionTokens(output)

    output = output.map(token =>
      typeof token === 'string' ? token.trim() : token
    )

    if (output.length === 1 && Array.isArray(output[0])) {
      return output[0]
    }

    return output
  }

  evaluateTokens(tokens) {
    if (tokens.includes(this.strings.operator)) {
      const result = this.strings.getConcatenationResult(tokens)

      return {
        type: TYPES.string,
        value: result,
      }
    }

    if (areItemsInArray(tokens, this.arithmetic.operators)) {
      const result = this.arithmetic.calculateArithmetic(tokens)

      return {
        type: TYPES.number,
        value: result,
      }
    }

    if (areItemsInArray(tokens, this.boolean.logicOperators)) {
      const result = this.boolean.evaluateBoolean(tokens)

      return {
        type: TYPES.boolean,
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

  expressionIsTrue(expression) {
    const result = this.getExpressionValue(expression)

    if (result.type !== TYPES.boolean) {
      throw new Error(
        `Expression '${expression}' does not evaluate to a boolean`
      )
    }

    return result.value === true
  }
}

export default Logic
