export const areItemsInArray = (items, array) => {
  for (let i = 0; i < items.length; i++) {
    if (array.includes(items[i])) {
      return true
    }
  }

  return false
}
