/**
 * leftVersion < rightVersion ?
 */
export const compareLeftVersionLessThanRightVersions = (
  leftVersion: string,
  rightVersion: string,
): boolean => {
  const leftVersionList = leftVersion.split('.')
  const rightVersionList = rightVersion.split('.')
  const maxLen = Math.max(leftVersionList.length, rightVersionList.length)
  while (leftVersionList.length < maxLen) {
    leftVersionList.push('0')
  }
  while (rightVersionList.length < maxLen) {
    rightVersionList.push('0')
  }
  for (let i = 0; i < maxLen; i++) {
    const leftItem = parseInt(leftVersionList[i], 10)
    const rightItem = parseInt(rightVersionList[i], 10)
    if (leftItem > rightItem) {
      return false
    }
    if (leftItem < rightItem) {
      return true
    }
  }
  return false
}
