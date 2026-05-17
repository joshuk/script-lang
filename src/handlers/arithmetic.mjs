import { TYPES } from '../constants.mjs'
import { getError } from '../helpers/errors.mjs'
import { stripWhitespace } from '../helpers/string.mjs'
import { isNumber } from '../helpers/types/number.mjs'

class Arithmetic {
  constructor(logic) {
    this.operators = ['/', '*', '+', '-']

    this.logic = logic
  }

  getTokenResult(token) {
    const isArray = Array.isArray(token)

    if (isArray && token.length > 1) {
      return this.calculateArithmetic(token)
    }

    const result = this.logic.getTokenValue(isArray ? token[0] : token)

    if (result.type !== TYPES.number) {
      throw new Error(`Token '${token}' is not of type number`)
    }

    return Number(result.value)
  }

  getArithmeticResult(tokens, operator) {
    const outputTokens = []
    let index = 0

    while (index < tokens.length) {
      const previousToken = tokens[index - 1]
      const token = tokens[index]
      const nextToken = tokens[index + 1]

      // This is just a type check on the token, it isn't used
      // for any logic.
      if (!this.operators.includes(token)) {
        this.getTokenResult(token)
      }

      if (token !== operator) {
        outputTokens.push(token)
        index += 1

        continue
      }

      if (
        index === 0 ||
        index === tokens.length - 1 ||
        this.operators.includes(previousToken) ||
        this.operators.includes(nextToken)
      ) {
        throw getError('Invalid arithmetic parameter', index)
      }

      const previousTokenResult = this.getTokenResult(previousToken)
      const nextTokenResult = this.getTokenResult(nextToken)

      let result = null

      switch (operator) {
        case '+':
          result = previousTokenResult + nextTokenResult
          break
        case '-':
          result = previousTokenResult - nextTokenResult
          break
        case '*':
          result = previousTokenResult * nextTokenResult
          break
        case '/':
          if (previousTokenResult === 0 || nextTokenResult === 0) {
            throw getError('Cannot divide by 0', index)
          }

          result = previousTokenResult / nextTokenResult
          break
      }

      outputTokens.pop()
      outputTokens.push(result)

      // If the token after the increment is the same operator,
      // it will calculate next using the previous token in the
      // tokens array instead of the newly calculated result.
      // To fix this, replace the previous token with the result.
      tokens[index + 1] = result

      index += 2
    }

    return outputTokens
  }

  calculateArithmetic(tokens) {
    let calculatedTokens = [...tokens]

    for (const operator of this.operators) {
      calculatedTokens = this.getArithmeticResult(calculatedTokens, operator)
    }

    return Number(calculatedTokens[0])
  }

  combineDecimals(tokens) {
    const output = []
    let index = 0

    while (index < tokens.length) {
      const token = tokens[index]
      const previousToken = tokens[index - 1]
      const nextToken = tokens[index + 1]

      if (token === '.' && isNumber(previousToken)) {
        if (!isNumber(nextToken)) {
          throw new Error(`Expected number after '.', got '${nextToken || ''}'`)
        }

        output.pop()
        output.push(`${previousToken}.${nextToken}`)

        index += 2

        continue
      }

      output.push(token)

      index += 1
    }

    return output
  }

  combineNegativeNumbers(tokens) {
    const operators = this.logic.operators
    const outputTokens = []
    let index = 0

    while (index < tokens.length) {
      const token = tokens[index]
      const nextToken = tokens[index + 1]

      if (
        token === '-' &&
        (index === 0 || operators.includes(tokens[index - 1])) &&
        !operators.includes(nextToken)
      ) {
        const isVariable = this.logic.variables.isVariable(nextToken)
        let variable = null

        if (isVariable) {
          variable = this.logic.variables.getVariable(nextToken)
        }

        if (
          (!isVariable && !isNumber(nextToken)) ||
          (isVariable && variable.type !== TYPES.number)
        ) {
          throw new Error(`Unexpected -`)
        }

        if (isVariable) {
          outputTokens.push(String(variable.value * -1))
        } else {
          outputTokens.push(token + nextToken)
        }

        index += 2

        continue
      }

      outputTokens.push(token)
      index += 1
    }

    return outputTokens
  }

  calculateString(string) {
    string = stripWhitespace(string)

    let tokens = this.parseBrackets(string)
    tokens = this.combineNegativeNumbers(tokens)

    const result = this.calculateArithmetic(tokens)

    return result
  }
}

export default Arithmetic
