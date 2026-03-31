import { getError } from '../helpers/errors.mjs'
import { isVariableNameValid } from '../helpers/variables.mjs'

class Variables {
  constructor(logic) {
    this.variables = {}

    this.logic = logic
  }

  isVariable(name) {
    if (this.variables[name]) {
      return true
    }

    return false
  }

  getVariable(name) {
    if (!this.isVariable(name)) {
      throw new Error(`Unknown variable '${name}'`)
    }

    return this.variables[name]
  }

  setVariable(defType, type, name, value) {
    this.variables[name] = {
      isConst: defType === 'const',
      type,
      value,
    }
  }

  initVariable(matches) {
    const [line, defType, name, assignedValue] = matches

    const variableNameValid = isVariableNameValid(name)

    if (!variableNameValid.isValid) {
      const position = variableNameValid.errorPosition
      const column = type.length + position + 1

      throw getError(`Variable name '${name}' is invalid`, column)
    }

    if (!assignedValue) {
      throw getError(`Variable '${name}' must have a value`, line.length - 1)
    }

    if (this.isVariable(name)) {
      throw getError(
        `Variable '${name}' is already defined`,
        defType.length + 1
      )
    }

    try {
      const { type, value } = this.logic.getExpressionValue(assignedValue)

      this.setVariable(defType, type, name, value)
    } catch (e) {
      const errorIndex = matches.input.indexOf('=') + 2

      throw getError(e.message, errorIndex)
    }
  }
}

export default Variables
