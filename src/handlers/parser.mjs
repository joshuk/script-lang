import { readFile } from 'fs/promises'
import { getLineType } from '../helpers/regex.mjs'
import { getError, getFirstDifferenceIndex } from '../helpers/errors.mjs'
import Logic from './logic.mjs'
import { getCharacterLengthAtStart } from '../helpers/string.mjs'
import { getScope } from '../helpers/scope.mjs'
import { LINE_TYPES, TYPES } from '../constants.mjs'
import { randomUUID } from 'crypto'

class Parser {
  constructor({ variables = null } = {}) {
    this.programCounter = {}
    this.lines = {}
    this.isErroring = false

    this.logic = new Logic(this)

    if (variables !== null) {
      this.logic.variables.variables = variables
    }
  }

  getNextLineTypeWithIndent(id, types, indent) {
    const lines = this.lines[id]

    for (let i = this.programCounter[id]; i < lines.length; i++) {
      const line = lines[i]
      const indentation = getCharacterLengthAtStart(line)
      const lineType = getLineType(line)

      if (!types.includes(lineType.type) || indentation !== indent) {
        continue
      }

      return i
    }

    return null
  }

  handleConditional(id, type, matches) {
    const programCounter = this.programCounter[id]
    const currentLine = this.lines[id][programCounter]
    const [, expression] = matches

    const currentIndentation = getCharacterLengthAtStart(currentLine)

    if (this.logic.expressionIsTrue(expression)) {
      this.logic.visibleScopes.push(
        getScope(id, type, programCounter, currentIndentation)
      )

      return programCounter + 1
    }

    const acceptedTypes = [LINE_TYPES.closingBracket]

    if (type === LINE_TYPES.ifCondition) {
      acceptedTypes.push(LINE_TYPES.else)
    }

    const nextLineIndex = this.getNextLineTypeWithIndent(
      id,
      acceptedTypes,
      currentIndentation
    )

    if (nextLineIndex === null) {
      throw new Error('Closing bracket not found')
    }

    const lineType = getLineType(this.lines[id][nextLineIndex])

    if (lineType.type === LINE_TYPES.else) {
      this.logic.visibleScopes.push(
        getScope(id, LINE_TYPES.else, nextLineIndex, currentIndentation)
      )
    }

    return nextLineIndex + 1
  }

  handleElse(id) {
    const currentScope = this.logic.getCurrentScope()

    if (currentScope.type !== LINE_TYPES.ifCondition) {
      throw new Error('Corresponding if condition not found')
    }

    const closingBracketIndex = this.getNextLineTypeWithIndent(
      id,
      LINE_TYPES.closingBracket,
      currentScope.indent
    )

    if (closingBracketIndex === null) {
      throw new Error('Closing bracket not found')
    }

    this.logic.visibleScopes.pop()

    return closingBracketIndex + 1
  }

  handleClosingBracket(id) {
    const programCounter = this.programCounter[id]
    const line = this.lines[id][programCounter]
    const currentIndentation = getCharacterLengthAtStart(line)
    const currentScope = this.logic.getCurrentScope()

    if (currentScope.indent !== currentIndentation) {
      throw new Error(
        `Indentation must match conditional at line ${currentScope.line}`
      )
    }

    this.logic.visibleScopes.pop()

    switch (currentScope.type) {
      case LINE_TYPES.whileCondition:
        return currentScope.line
      default:
        return programCounter + 1
    }
  }

  handleFunctionDeclaration(id, matches) {
    const programCounter = this.programCounter[id]
    const line = this.lines[id][programCounter]
    const [, name, args] = matches

    const functionInfo = this.logic.functions.getFunctionInfo(name, args)
    const currentIndentation = getCharacterLengthAtStart(line)

    const closingBracketIndex = this.getNextLineTypeWithIndent(
      id,
      [LINE_TYPES.closingBracket],
      currentIndentation
    )

    if (closingBracketIndex === null) {
      throw new Error('Closing bracket not found')
    }

    const startLine = programCounter + 1

    this.logic.functions.registerFunction(
      id,
      functionInfo,
      startLine,
      closingBracketIndex,
      getScope(id, LINE_TYPES.functionDeclaration, startLine, 0)
    )

    return closingBracketIndex + 1
  }

  getReturnValue(matches) {
    const [, expression] = matches

    const lastFunctionScopeIndex =
      this.logic.visibleScopes.length -
      [...this.logic.visibleScopes]
        .reverse()
        .findIndex(({ type }) => type === LINE_TYPES.functionDeclaration) -
      1

    this.logic.visibleScopes = this.logic.visibleScopes.slice(
      0,
      lastFunctionScopeIndex
    )

    if (!expression) {
      return this.logic.getTokenValue(TYPES.null)
    }

    return this.logic.getExpressionValue(expression)
  }

  parseLine(id) {
    const programCounter = this.programCounter[id]
    const line = this.lines[id][programCounter]

    if (line.trim() === '') {
      this.programCounter[id] += 1

      return
    }

    const result = getLineType(line)

    if (!result) {
      throw getError('Unknown Declaration', 0)
    }

    const { type, matches } = result

    if (matches.input !== matches[0]) {
      throw getError(
        'Invalid character',
        getFirstDifferenceIndex(matches.input, matches[0])
      )
    }

    switch (type) {
      case LINE_TYPES.variableDeclaration:
        this.logic.variables.initVariable(matches)

        this.programCounter[id] += 1
        break
      case LINE_TYPES.variableUpdate:
        this.logic.variables.updateVariable(matches)

        this.programCounter[id] += 1
        break
      case LINE_TYPES.ifCondition:
      case LINE_TYPES.whileCondition:
        this.programCounter[id] = this.handleConditional(id, type, matches)
        break
      case LINE_TYPES.else:
        this.programCounter[id] = this.handleElse(id)
        break
      case LINE_TYPES.closingBracket:
        this.programCounter[id] = this.handleClosingBracket(id)
        break
      case LINE_TYPES.functionDeclaration:
        this.programCounter[id] = this.handleFunctionDeclaration(id, matches)
        break
      case LINE_TYPES.return:
        return this.getReturnValue(matches)
      case LINE_TYPES.comment:
        this.programCounter[id] += 1
        break
    }
  }

  parseLines(lines, functionInfo = null) {
    const id = randomUUID()
    this.lines[id] = lines
    this.programCounter[id] = 0

    while (this.programCounter[id] < this.lines[id].length) {
      try {
        const output = this.parseLine(id)

        if (output) {
          return output
        }
      } catch (e) {
        if (this.isErroring) {
          return
        }

        const line =
          (functionInfo ? functionInfo.startLine : 0) + this.programCounter[id]

        console.log('')
        console.log(`Error on line ${line + 1} - ${e.message}`)

        console.log(this.lines[id][this.programCounter[id]].trim())
        if (e.position) {
          console.log(`${Array(Number(e.position.column)).fill('-').join('')}^`)
        }

        this.programCounter[id] = this.lines[id].length
        this.isErroring = true
      }
    }
  }

  parseText(text) {
    this.parseLines(text.split('\n'))
  }

  async parseFile(filename) {
    const contents = await readFile(filename, 'utf-8')

    this.parseText(contents)

    console.log('')
    console.log(this.logic.variables.variables)
  }
}

export default Parser
