import { TYPES } from './src/constants.mjs'
import Parser from './src/handlers/parser.mjs'
;(() => {
  const args = process.argv.slice(2)

  if (args[0] !== '-f' || !args[1]) {
    console.log('Argument -f must be passed with a valid filename')
    return
  }

  const startTime = performance.now()

  const parser = new Parser({
    variables: {
      _x: {
        isConst: false,
        type: TYPES.number,
        value: 0,
        onChange: newValue => {
          console.log('New _x value', newValue)
        },
      },
    },
    functions: {
      pow: {
        name: 'pow',
        args: [
          {
            name: 'num',
            type: TYPES.number,
            defaultValue: null,
          },
          {
            name: 'power',
            type: TYPES.number,
            defaultValue: null,
          },
        ],
        requiredArgs: 1,
        getResult: (num, power) => {
          return Math.pow(num, power)
        },
        resultType: TYPES.number,
      },
    },
  })

  parser.parseFile(`scripts/${args[1]}`)

  console.log(`Execution time: ${performance.now() - startTime}ms`)
})()
