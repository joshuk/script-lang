const whitespaceChar = '[\\s]'
const variableName = '\\d\\w_'

const lineTypes = {
  comment: {
    regex: new RegExp(`\/\/.*`),
  },
  variableDeclaration: {
    regex: new RegExp(
      `(const|let)(?:${whitespaceChar}+([${variableName}]+)(?:${whitespaceChar}+=${whitespaceChar}+(.+))*)`
    ),
  },
}

export const getLineType = line => {
  for (const [key, value] of Object.entries(lineTypes)) {
    const matches = value.regex.exec(line)

    if (matches) {
      return {
        type: key,
        matches,
      }
    }
  }

  return false
}
