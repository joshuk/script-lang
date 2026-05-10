export const isFunction = token => {
  const keys = JSON.stringify(Object.keys(token))
  const expectedKeys = JSON.stringify(['name', 'args'])

  if (typeof token === 'object' && keys === expectedKeys) {
    return true
  }

  return false
}
