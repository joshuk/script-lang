import { last } from '../helpers/array.mjs'
import { getError } from '../helpers/errors.mjs'
import { isVariableNameValid } from '../helpers/variables.mjs'

class Variables {
  constructor(logic) {
    this.variables = {}

    this.logic = logic
  }

  isVariable(name) {
    const variable = this.variables[name]

    if (variable && this.logic.visibleScopes.includes(variable.scope)) {
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

  setNewVariable(defType, type, name, value) {
    this.variables[name] = {
      isConst: defType === 'const',
      type,
      value,
      scope: last(this.logic.visibleScopes),
    }
  }

  setVariable(name, value) {
    if (!this.isVariable(name)) {
      throw new Error(`Unknown variable '${name}'`)
    }

    this.variables[name].value = value
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

      this.setNewVariable(defType, type, name, value)
    } catch (e) {
      const errorIndex = matches.input.indexOf('=') + 2

      throw getError(e.message, errorIndex)
    }
  }

  updateVariable(matches) {
    const [line, name, operator, expression] = matches

    const variable = this.getVariable(name)

    if (variable.isConst) {
      throw getError(`Variables defined as const cannot be reassigned`, 0)
    }

    const validOperators = [
      ...this.logic.arithmetic.operators,
      this.logic.strings.operator,
    ]

    if (operator && !validOperators.includes(operator)) {
      throw getError(`Invalid operator '${operator}'`, line.indexOf(operator))
    }

    let query = expression

    if (operator) {
      query = `${name} ${operator} (${expression})`
    }

    try {
      const { value } = this.logic.getExpressionValue(query)

      this.setVariable(name, value)
    } catch (e) {
      const errorIndex = matches.input.indexOf('=') + 2

      throw getError(e.message, errorIndex)
    }
  }
}

export default Variables
