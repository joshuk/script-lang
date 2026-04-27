import { TYPES } from '../constants.mjs'
import { functionArgument } from '../helpers/regex.mjs'
import { isVariableNameValid } from '../helpers/variables.mjs'

class Functions {
  constructor(logic) {
    this.logic = logic

    this.functions = []
  }

  getArgsObject(args) {
    const argsArray = args.split(',').map(arg => arg.trim())
    const allTypes = Object.keys(TYPES)

    const output = []

    for (let i = 0; i < argsArray.length; i++) {
      const argument = argsArray[i]

      const matches = functionArgument.exec(argument)

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

    return {
      name,
      args: argsObject,
    }
  }

  registerFunction(data) {
    const { name, args, startLine, endLine } = data

    // TODO - Check if function already exists

    this.functions[name] = {
      args,
      startLine,
      endLine,
    }
  }
}

export default Functions
