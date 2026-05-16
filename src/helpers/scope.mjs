import { LINE_TYPES } from '../constants.mjs'

export const getScope = (id, type, line, indent, loopCount = null) => {
  return {
    id,
    type,
    line,
    indent,
    loopCount,
  }
}

export const getScopeString = ({ id, type, line, indent, loopCount }) => {
  return `${id}.${type}.${line}.${indent}.${loopCount}`
}

export const getActiveScopeKey = (
  scopes,
  haystack,
  needle,
  lastFunctionScopeOnly = false
) => {
  const lastFunctionScope =
    scopes.length -
    [...scopes]
      .reverse()
      .findIndex(scope => scope.type === LINE_TYPES.functionDeclaration) -
    1

  for (let i = 0; i < scopes.length; i++) {
    const scope = getScopeString(scopes[i])

    if (
      lastFunctionScopeOnly &&
      scope.type === LINE_TYPES.functionDeclaration &&
      i < lastFunctionScope
    ) {
      continue
    }

    const scopeGroup = haystack[scope]

    if (scopeGroup?.[needle]) {
      return scope
    }
  }

  return false
}
