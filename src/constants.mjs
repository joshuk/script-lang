import { getScope } from './helpers/scope.mjs'

export const TYPES = {
  number: 'number',
  boolean: 'boolean',
  string: 'string',
  null: null,
}

export const LINE_TYPES = {
  comment: 'comment',
  variableDeclaration: 'variableDeclaration',
  variableUpdate: 'variableUpdate',
  ifCondition: 'ifCondition',
  closingBracket: 'closingBracket',
}

export const GLOBAL_SCOPE = getScope(null, 0, 0)
