export const isBoolean = boolean => {
  return ['true', 'false'].includes(boolean)
}

export const getBooleanValue = boolean => {
  return boolean === 'true'
}
