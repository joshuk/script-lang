import { readFile } from 'fs/promises'
import { getLineType } from '../helpers/regex.mjs'
import { getError, getFirstDifferenceIndex } from '../helpers/errors.mjs'
import Logic from './logic.mjs'
import { getCharacterLengthAtStart } from '../helpers/string.mjs'
import { getScope } from '../helpers/scope.mjs'
import { LINE_TYPES } from '../constants.mjs'

class Parser {
  constructor() {
    this.programCounter = 0
    this.lines = []

    this.logic = new Logic()
  }

  handleConditional(type, matches) {
    const currentLine = this.lines[this.programCounter]
    const [, expression] = matches

    const currentIndentation = getCharacterLengthAtStart(currentLine)

    if (this.logic.expressionIsTrue(expression)) {
      this.logic.visibleScopes.push(
        getScope(type, this.programCounter, currentIndentation)
      )

      return 1
    }

    for (let i = this.programCounter; i < this.lines.length; i++) {
      const line = this.lines[i]
      const lineType = getLineType(line)

      if (lineType.type !== LINE_TYPES.closingBracket) {
        continue
      }

      const indentation = getCharacterLengthAtStart(line)

      if (indentation === currentIndentation) {
        const difference = i - this.programCounter

        return difference + 1
      }
    }

    throw new Error(`Closing bracket not found`)
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
        this.programCounter += this.handleConditional('if', matches)
        break
      case LINE_TYPES.closingBracket:
        // TODO - Add checks in here, this makes assumptions
        this.logic.visibleScopes.pop()

        this.programCounter += 1
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
