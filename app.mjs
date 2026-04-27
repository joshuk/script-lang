import Parser from './src/handlers/parser.mjs'
;(() => {
  const args = process.argv.slice(2)

  if (args[0] !== '-f' || !args[1]) {
    console.log('Argument -f must be passed with a valid filename')
    return
  }

  const startTime = performance.now()

  const parser = new Parser()

  parser.parseFile(`scripts/${args[1]}`)

  console.log(`Execution time: ${performance.now() - startTime}ms`)
})()
