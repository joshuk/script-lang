export const isBoolean = boolean => {
  return ['true', 'false'].includes(String(boolean))
}

export const getBooleanValue = boolean => {
  return String(boolean) === 'true'
}
