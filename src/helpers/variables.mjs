export const isVariableNameValid = (name) => {
  if (name.startsWith('_')) {
    return {
      isValid: false,
      errorPosition: 0
    }
  }

  if (name.endsWith('_')) {
    return {
      isValid: false,
      errorPosition: name.length - 1
    }
  }

  return {
    isValid: true,
    errorPosition: -1
  }
}