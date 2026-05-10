import { TYPES } from '../constants.mjs'
import { functionArgument } from '../helpers/regex.mjs'
import { isVariableNameValid } from '../helpers/variables.mjs'

class Functions {
  constructor(logic) {
    this.logic = logic

    this.operators = [',']

    this.functions = {}
  }

  isFunction(name) {
    const func = this.functions[name]

    if (func && this.logic.visibleScopes.includes(func.scope)) {
      return true
    }

    return false
  }

  getFunction(name) {
    if (!this.isFunction(name)) {
      throw new Error(`Undefined function '${name}'`)
    }

    return this.functions[name]
  }

  registerFunction(id, functionInfo, startLine, endLine, innerScope) {
    const { name } = functionInfo

    if (this.logic.variables.isVariable(name)) {
      throw new Error(`'${name}' is already defined as a variable`)
    }

    if (this.isFunction(name)) {
      throw new Error(`Function '${name}' is already defined`)
    }

    this.functions[name] = {
      id,
      ...functionInfo,
      startLine,
      endLine,
      scope: this.logic.getCurrentScope(),
      innerScope,
    }
  }

  formatArgTokens(tokens) {
    const output = []
    let stack = []

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i]

      if (this.operators.includes(token)) {
        output.push(stack)
        stack = []
        continue
      }

      stack.push(token)
    }

    output.push(stack)

    return output
  }

  formatFunctionTokens(tokens) {
    let index = 0
    const output = []

    while (index < tokens.length) {
      const token = tokens[index]
      const nextToken = tokens[index + 1]

      if (this.isFunction(token) && Array.isArray(nextToken)) {
        output.push({
          name: token,
          args: this.formatArgTokens(nextToken),
        })

        index += 2
        continue
      }

      output.push(token)
      index += 1
    }

    return output
  }

  getArgsObject(args) {
    const argsArray = args.split(',').map(arg => arg.trim())
    const allTypes = Object.keys(TYPES)

    const output = []

    for (let i = 0; i < argsArray.length; i++) {
      const argument = argsArray[i]

      const matches = functionArgument.exec(argument)

      if (!matches) {
        throw new Error(
          `Argument definition '${argument}' is invalid. Format 'name:type'`
        )
      }

      const [, name, type, defaultValueExpression] = matches

      const isNameValid = isVariableNameValid(name)

      if (!isNameValid.isValid) {
        throw new Error(`Argument name '${name}' is invalid`)
      }

      if (!allTypes.includes(type)) {
        throw new Error(
          `Argument '${name}' must be of type ${allTypes.map(type => `'${type}'`).join(', ')}`
        )
      }

      let defaultValue = null

      if (defaultValueExpression) {
        defaultValue = this.logic.getExpressionValue(defaultValueExpression)

        if (defaultValue.type !== type) {
          throw new Error(
            `Default value '${defaultValueExpression}' is not of type '${type}'`
          )
        }
      }

      output.push({
        name,
        type,
        defaultValue,
      })
    }

    return output
  }

  getFunctionInfo(name, args) {
    const isNameValid = isVariableNameValid(name)

    if (!isNameValid.isValid) {
      throw new Error(`Invalid function name '${name}'`)
    }

    const argsObject = this.getArgsObject(args)

    const requiredArgs = argsObject.filter(arg => arg.defaultValue === null)

    return {
      name,
      args: argsObject,
      requiredArgs: requiredArgs.length,
    }
  }

  validateArgs(name, args) {
    const func = this.getFunction(name)

    if (args.length < func.requiredArgs) {
      throw new Error(
        `Expected at least ${func.requiredArgs} arguments, got ${args.length}`
      )
    }

    if (args.length > func.args.length) {
      throw new Error(
        `Passed ${args.length} arguments, only ${func.args.length} defined`
      )
    }

    const argValues = {}

    for (let i = 0; i < func.args.length; i++) {
      const { name, type, defaultValue } = func.args[i]
      const argExpression = args[i]

      if (!argExpression) {
        if (!defaultValue) {
          throw new Error(`Argument '${name}' is required but is undefined`)
        }

        argValues[name] = defaultValue
        continue
      }

      const argResult = this.logic.getExpressionValue(argExpression)

      if (argResult.type !== type) {
        throw new Error(
          `Argument '${argExpression}' is of type ${argResult.type}, expected type '${type}'`
        )
      }

      argValues[name] = argResult
    }

    return argValues
  }

  getFunctionResult(token) {
    const { name, args: argInfo } = token
    const func = this.getFunction(name)

    const args = this.validateArgs(name, argInfo)

    this.logic.variables.setFunctionArgs(args)

    this.logic.visibleScopes.push(func.innerScope)

    const functionLines = this.logic.parser.lines[func.id].slice(
      func.startLine,
      func.endLine
    )

    const result = this.logic.parser.parseLines(functionLines, func)

    this.logic.variables.clearFunctionArgs({})

    return result
  }
}

export default Functions
