import Parser from './src/handlers/parser.mjs'

const startTime = performance.now()

const parser = new Parser()

parser.parseFile('example.scl')

console.log(`Execution time: ${performance.now() - startTime}ms`)
