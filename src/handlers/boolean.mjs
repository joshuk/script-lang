import { TYPES } from '../constants.mjs'
import { areItemsInArray } from '../helpers/array.mjs'
import { stringsAreInString } from '../helpers/string.mjs'

class Boolean {
  constructor(logic) {
    this.logic = logic

    this.operators = ['>', '<', '=', '!', '&', '|']
    this.logicOperators = ['>', '<', '==', '!=', '<=', '>=', '&&', '||']
  }

  combineOperators(tokens) {
    const output = []

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]

      if (
        this.operators.includes(token) &&
        this.operators.includes(tokens[i - 1])
      ) {
        output.pop()
        output.push(tokens[i - 1] + token)

        continue
      }

      output.push(token)
    }

    return output
  }

  containBooleanEquations(tokens) {
    if (!areItemsInArray(['||', '&&'], tokens)) {
      return tokens
    }

    const output = []
    let stack = []

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i].trim()

      if (['&&', '||'].includes(token)) {
        output.push(stack)
        stack = []

        output.push(token)

        continue
      }

      stack.push(token)
    }

    if (stack.length > 0) {
      output.push(stack)
    }

    return output
  }

  getTokenValue(token) {
    if (Array.isArray(token) && token.length === 1) {
      token = token[0]
    }

    if (Array.isArray(token)) {
      return this.logic.evaluateTokens(token)
    }

    return this.logic.getTokenValue(token)
  }

  getExpressionResult(tokens) {
    let result = false
    let index = 0

    while (index < tokens.length) {
      const previousToken = tokens[index - 1]
      const token = tokens[index]
      const nextToken = tokens[index + 1]

      if (this.logicOperators.includes(token)) {
        const previousTokenValue = this.getTokenValue(previousToken)
        const nextTokenValue = this.getTokenValue(nextToken)

        if (previousTokenValue.type !== nextTokenValue.type) {
          throw new Error(
            `Tokens '${previousToken}' and '${previousTokenValue}' are not of the same type`
          )
        }

        if (stringsAreInString(['<', '>'], token)) {
          if (previousTokenValue.type !== TYPES.number) {
            throw new Error(`Token '${previousToken}' is not of type 'number'`)
          }

          if (nextTokenValue.type !== TYPES.number) {
            throw new Error(`Token '${nextToken}' is not of type 'number'`)
          }

          switch (token) {
            case '>':
              result = previousTokenValue.value > nextTokenValue.value
              break
            case '<':
              result = previousTokenValue.value < nextTokenValue.value
              break
            case '>=':
              result = previousTokenValue.value >= nextTokenValue.value
              break
            case '<=':
              result = previousTokenValue.value <= nextTokenValue.value
              break
          }
        }

        if (['==', '!='].includes(token)) {
          switch (token) {
            case '==':
              result = previousTokenValue.value === nextTokenValue.value
              break
            case '!=':
              result = previousTokenValue.value !== nextTokenValue.value
              break
          }
        }

        tokens[index + 1] = String(result)
        index += 2
        continue
      }

      index += 1
    }

    return result
  }

  getAlgebraResult(tokens) {
    const algebraOperators = ['||', '&&']
    let index = 0
    let result = false

    while (index < tokens.length) {
      const token = tokens[index]

      if (algebraOperators.includes(token)) {
        const previousToken = tokens[index - 1]
        const nextToken = tokens[index + 1]
        const previousTokenValue = this.getTokenValue(previousToken)
        const nextTokenValue = this.getTokenValue(nextToken)

        if (previousTokenValue.type !== TYPES.boolean) {
          throw new Error(`Token '${previousToken}' is not of type 'boolean'`)
        }

        if (nextTokenValue.type !== TYPES.boolean) {
          throw new Error(`Token '${nextToken}' is not of type 'boolean'`)
        }

        switch (token) {
          case '||':
            result = previousTokenValue.value || nextTokenValue.value
            break
          case '&&':
            result = previousTokenValue.value && nextTokenValue.value
            break
        }

        tokens[index + 1] = String(result)
        index += 2
        continue
      }

      index += 1
    }

    return result
  }

  evaluateBoolean(tokens) {
    if (areItemsInArray(['||', '&&'], tokens)) {
      return this.getAlgebraResult(tokens)
    }

    return this.getExpressionResult(tokens)
  }
}

export default Boolean
