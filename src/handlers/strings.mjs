import { TYPES } from '../constants.mjs'
import {
  getStringValue,
  getUnescapedQuoteIndexes,
  isString,
} from '../helpers/types/string.mjs'

class Strings {
  constructor(logic) {
    this.logic = logic

    this.operator = '.'
  }

  combineStrings(tokens) {
    const quotes = ["'", '"']
    const output = []
    let index = 0
    let lastStringIndex = null
    let quoteCharacter = null

    while (index < tokens.length) {
      const token = tokens[index]

      if (typeof token !== 'string') {
        output.push(token)
        index += 1
        continue
      }

      const trimmedToken = token.trim()

      if (lastStringIndex === null && isString(trimmedToken, false)) {
        output.push(token)

        index += 1
        continue
      }

      const firstCharacter = trimmedToken.slice(0, 1)

      if (lastStringIndex === null && quotes.includes(firstCharacter)) {
        const unescapedQuotes = getUnescapedQuoteIndexes(
          trimmedToken.slice(1),
          firstCharacter
        )

        if (unescapedQuotes.length > 0) {
          throw new Error('Unexpected end of string')
        }

        lastStringIndex = index
        quoteCharacter = firstCharacter

        index += 1
        continue
      }

      if (lastStringIndex !== null && trimmedToken.includes(quoteCharacter)) {
        const unescapedQuotes = getUnescapedQuoteIndexes(
          trimmedToken,
          quoteCharacter
        )

        if (
          unescapedQuotes.length > 1 &&
          unescapedQuotes[0] !== trimmedToken.length - 1
        ) {
          throw new Error('Unexpected end of string')
        }

        output.push(tokens.slice(lastStringIndex, index).join('') + token)
        index += index - lastStringIndex - 1
        lastStringIndex = null
        quoteCharacter = null
        continue
      }

      if (lastStringIndex === null) {
        output.push(token)
      }

      index += 1
    }

    if (lastStringIndex !== null) {
      throw new Error(`Expected closing ${quoteCharacter}`)
    }

    return output
  }

  getConcatenationResult(tokens) {
    const tokenValues = []

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]

      if (token === this.operator) {
        continue
      }

      if (Array.isArray(token)) {
        tokenValues.push(this.getConcatenationResult(token))

        continue
      }

      const isVariable = this.logic.variables.isVariable(token)

      if (isVariable) {
        const variable = this.logic.variables.getVariable(token)

        if (variable.type !== TYPES.string) {
          throw new Error(`Variable '${token}' is not of type 'string'`)
        }

        tokenValues.push(variable.value)
        continue
      }

      if (!isString(token)) {
        throw new Error(`Token '${token}' is not of type 'string'`)
      }

      tokenValues.push(getStringValue(token))
    }

    return tokenValues.join('')
  }
}

export default Strings
