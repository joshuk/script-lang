import { readFile } from 'fs/promises'
import { getLineType } from '../helpers/regex.mjs'
import { getError, getFirstDifferenceIndex } from '../helpers/errors.mjs'
import Logic from './logic.mjs'
import { getCharacterLengthAtStart } from '../helpers/string.mjs'
import { getScope } from '../helpers/scope.mjs'
import { LINE_TYPES, TYPES } from '../constants.mjs'
import { randomUUID } from 'crypto'
import { isFunction } from '../helpers/types/function.mjs'
import { last } from '../helpers/array.mjs'

class Parser {
  constructor({ variables = null } = {}) {
    this.programCounter = {}
    this.lines = {}
    this.isErroring = false

    this.logic = new Logic(this)
    this.loopCount = null

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
      if (type === LINE_TYPES.whileCondition) {
        this.loopCount = this.loopCount === null ? 0 : this.loopCount + 1
      }

      this.logic.visibleScopes.push(
        getScope(id, type, programCounter, currentIndentation, this.loopCount)
      )

      return programCounter + 1
    }

    if (this.loopCount !== null) {
      this.loopCount = null
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
      closingBracketIndex
    )

    return closingBracketIndex + 1
  }

  getReturnValue(matches, functionInfo) {
    if (!functionInfo) {
      return null
    }

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

  checkForFunctions(line) {
    const tokens = this.logic.getCleanedTokens(line)

    if (tokens.length > 1 || !isFunction(tokens[0])) {
      return false
    }

    this.logic.getTokenValue(tokens[0])

    return true
  }

  parseLine(id, functionInfo) {
    const programCounter = this.programCounter[id]
    const line = this.lines[id][programCounter]

    if (line.trim() === '') {
      this.programCounter[id] += 1

      return
    }

    const { type, matches } = getLineType(line)

    if (matches && matches.input !== matches[0]) {
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
        return this.getReturnValue(matches, functionInfo)
      case LINE_TYPES.comment:
        this.programCounter[id] += 1
        break
      case LINE_TYPES.unknown:
        if (!this.checkForFunctions(line.trim())) {
          throw getError('Unknown Declaration', 0)
        }

        this.programCounter[id] += 1
        break
    }
  }

  parseLines(lines, functionInfo = null) {
    const id = randomUUID()
    this.lines[id] = lines
    this.programCounter[id] = 0

    if (functionInfo) {
      const functionScope = getScope(
        id,
        LINE_TYPES.functionDeclaration,
        functionInfo.startLine,
        0
      )

      this.logic.visibleScopes.push(functionScope)
    }

    while (this.programCounter[id] < this.lines[id].length) {
      try {
        const output = this.parseLine(id, functionInfo)

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
    console.log(this.logic.functions.functions)
    console.log(this.logic.variables.variables)
  }
}

export default Parser
