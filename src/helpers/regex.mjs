import { LINE_TYPES, TYPES } from '../constants.mjs'

const whitespaceChar = '[\\s]'
const variableName = '\\d\\w_'

const lineTypes = {
  [LINE_TYPES.comment]: {
    regex: new RegExp(`\/\/.*`),
  },
  [LINE_TYPES.variableDeclaration]: {
    regex: new RegExp(
      `^(const|let)(?:${whitespaceChar}+([${variableName}]+)(?:${whitespaceChar}*=${whitespaceChar}*(.+))*)$`
    ),
  },
  [LINE_TYPES.variableUpdate]: {
    regex: new RegExp(
      `^([${variableName}]+)${whitespaceChar}*(.){0,1}=${whitespaceChar}*(.+)$`
    ),
  },
  [LINE_TYPES.ifCondition]: {
    regex: new RegExp(`^if${whitespaceChar}*\\((.*)\\)${whitespaceChar}*{$`),
  },
  [LINE_TYPES.closingBracket]: {
    regex: new RegExp('^}$'),
  },
  [LINE_TYPES.else]: {
    regex: new RegExp(`^}${whitespaceChar}*else${whitespaceChar}*{$`),
  },
  [LINE_TYPES.whileCondition]: {
    regex: new RegExp(`^while${whitespaceChar}*\\((.*)\\)${whitespaceChar}*{$`),
  },
  [LINE_TYPES.function]: {
    regex: new RegExp(
      `^function${whitespaceChar}*([${variableName}]*)\\((.*)\\)${whitespaceChar}*{$`
    ),
  },
}

export const functionArgument = new RegExp(
  `([${variableName}]*):([\\w]*)(?:${whitespaceChar}*=${whitespaceChar}*(.*)){0,1}`
)

export const getLineType = line => {
  line = line.trim()

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
