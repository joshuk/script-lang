export const stripWhitespace = string => {
  return string.replace(/\s/g, '')
}

export const stringsAreInString = (needles, haystack) => {
  const needleInHaystack = needles.find(needle => {
    return haystack.includes(needle)
  })

  return Boolean(needleInHaystack)
}

export const getAllIndexesOfStringInString = (needle, haystack) => {
  const output = []

  for (let i = 0; i < haystack.length; i++) {
    if (haystack[i] === needle) {
      output.push(i)
    }
  }

  return output
}

export const getCharacterLengthAtStart = (string, character = ' ') => {
  let length = 0

  for (let i = 0; i < string.length; i++) {
    if (string[i] !== character) {
      return length
    }

    length += 1
  }
}
