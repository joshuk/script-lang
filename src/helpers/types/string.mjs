import { getAllIndexesOfStringInString } from '../string.mjs'

export const isString = (string, throwError = true) => {
  if (string.length < 2) {
    return false
  }

  const startCharacter = string.slice(0, 1)

  if (
    !['"', "'"].includes(startCharacter) ||
    !string.endsWith(startCharacter)
  ) {
    return false
  }

  const innerText = string.slice(1, -1)
  const splitInnerText = innerText.split('')

  for (let i = 0; i < splitInnerText.length; i++) {
    const character = splitInnerText[i]

    if (character !== startCharacter) {
      continue
    }

    if (splitInnerText[i - 1] !== '\\') {
      if (throwError) {
        throw new Error('Unexpected end of string')
      }

      return false
    }
  }

  return true
}

export const getStringValue = string => {
  return string.slice(1, -1).replace(/\\/g, '')
}

export const getUnescapedQuoteIndexes = (string, character) => {
  const indexes = []

  const quoteIndexes = getAllIndexesOfStringInString(character, string)

  for (let i = 0; i < quoteIndexes.length; i++) {
    const quoteIndex = quoteIndexes[i]

    if (quoteIndex === 0 || string[quoteIndex - 1] !== '\\') {
      indexes.push(quoteIndex)
    }
  }

  return indexes
}
