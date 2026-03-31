import { readFile } from 'fs/promises'
import { getLineType } from '../helpers/regex.mjs'
import { getError, getFirstDifferenceIndex } from '../helpers/errors.mjs'
import Logic from './logic.mjs'

class Parser {
  constructor() {
    this.programCounter = 0

    this.logic = new Logic()
  }

  parseLine(line) {
    line = line.trim()

    if (line === '') {
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
      case 'variableDeclaration':
        this.logic.variables.initVariable(matches)

        this.programCounter += 1
        break
      case 'comment':
        this.programCounter += 1
        break
    }
  }

  parseText(text) {
    const lines = text.split('\n')

    while (this.programCounter < lines.length) {
      try {
        this.parseLine(lines[this.programCounter])
      } catch (e) {
        const line = this.programCounter

        console.log('')
        console.log(`Error on line ${line + 1} - ${e.message}`)

        console.log(lines[line])
        if (e.position) {
          console.log(`${Array(Number(e.position.column)).fill('-').join('')}^`)
        }

        this.programCounter = lines.length
      }
    }
  }

  async parseFile(filename) {
    const contents = await readFile(filename, 'utf-8')

    this.parseText(contents)

    console.log('')
    console.log(this.logic.variables)
  }
}

export default Parser
