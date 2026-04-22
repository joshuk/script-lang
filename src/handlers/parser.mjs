import { readFile } from 'fs/promises'
import { getLineType } from '../helpers/regex.mjs'
import { getError, getFirstDifferenceIndex } from '../helpers/errors.mjs'
import Logic from './logic.mjs'
import { getCharacterLengthAtStart } from '../helpers/string.mjs'
import { getScope } from '../helpers/scope.mjs'
import { LINE_TYPES } from '../constants.mjs'
import { last } from '../helpers/array.mjs'

class Parser {
  constructor() {
    this.programCounter = 0
    this.lines = []

    this.logic = new Logic()
  }

  getNextLineTypeWithIndent(types, indent) {
    for (let i = this.programCounter; i < this.lines.length; i++) {
      const line = this.lines[i]
      const indentation = getCharacterLengthAtStart(line)
      const lineType = getLineType(line)

      if (!types.includes(lineType.type) || indentation !== indent) {
        continue
      }

      return i
    }

    return null
  }

  handleConditional(type, matches) {
    const currentLine = this.lines[this.programCounter]
    const [, expression] = matches

    const currentIndentation = getCharacterLengthAtStart(currentLine)

    if (this.logic.expressionIsTrue(expression)) {
      this.logic.visibleScopes.push(
        getScope(type, this.programCounter, currentIndentation)
      )

      return this.programCounter + 1
    }

    const acceptedTypes = [LINE_TYPES.closingBracket]

    if (type === LINE_TYPES.ifCondition) {
      acceptedTypes.push(LINE_TYPES.else)
    }

    const nextLineIndex = this.getNextLineTypeWithIndent(
      acceptedTypes,
      currentIndentation
    )

    if (nextLineIndex === null) {
      throw new Error('Closing bracket not found')
    }

    const lineType = getLineType(this.lines[nextLineIndex])

    if (lineType.type === LINE_TYPES.else) {
      this.logic.visibleScopes.push(
        getScope(LINE_TYPES.else, nextLineIndex, currentIndentation)
      )
    }

    return nextLineIndex + 1
  }

  handleElse() {
    const currentScope = last(this.logic.visibleScopes)

    if (currentScope.type !== LINE_TYPES.ifCondition) {
      throw new Error('Corresponding if condition not found')
    }

    const closingBracketIndex = this.getNextLineTypeWithIndent(
      LINE_TYPES.closingBracket,
      currentScope.indent
    )

    if (closingBracketIndex === null) {
      throw new Error('Closing bracket not found')
    }

    this.logic.visibleScopes.pop()

    return closingBracketIndex + 1
  }

  handleClosingBracket() {
    const line = this.lines[this.programCounter]
    const currentIndentation = getCharacterLengthAtStart(line)
    const currentScope = last(this.logic.visibleScopes)

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
        return this.programCounter + 1
    }
  }

  parseLine() {
    const line = this.lines[this.programCounter]

    if (line.trim() === '') {
      this.programCounter += 1

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

        this.programCounter += 1
        break
      case LINE_TYPES.variableUpdate:
        this.logic.variables.updateVariable(matches)

        this.programCounter += 1
        break
      case LINE_TYPES.ifCondition:
      case LINE_TYPES.whileCondition:
        this.programCounter = this.handleConditional(type, matches)
        break
      case LINE_TYPES.else:
        this.programCounter = this.handleElse()
        break
      case LINE_TYPES.closingBracket:
        this.programCounter = this.handleClosingBracket()
        break
      case LINE_TYPES.comment:
        this.programCounter += 1
        break
    }
  }

  parseText(text) {
    this.lines = text.split('\n')

    while (this.programCounter < this.lines.length) {
      try {
        this.parseLine()
      } catch (e) {
        const line = this.programCounter

        console.log('')
        console.log(`Error on line ${line + 1} - ${e.message}`)

        console.log(this.lines[line])
        if (e.position) {
          console.log(`${Array(Number(e.position.column)).fill('-').join('')}^`)
        }

        this.programCounter = this.lines.length
      }
    }
  }

  async parseFile(filename) {
    const contents = await readFile(filename, 'utf-8')

    this.parseText(contents)

    console.log('')
    console.log(this.logic.variables.variables)
  }
}

export default Parser
