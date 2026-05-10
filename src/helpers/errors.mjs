export const getError = (message, column) => {
  const error = new Error(message)

  error.position = {
    column,
  }

  return error
}

export const getFirstDifferenceIndex = (stringOne, stringTwo) => {
  const splitStringOne = stringOne.split('')
  const splitStringTwo = stringTwo.split('')

  for (const index in splitStringOne) {
    if (splitStringOne[index] !== splitStringTwo[index]) {
      return index
    }
  }

  return false
}
