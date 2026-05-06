export const getBand = (level: number): number => {
  if (level <= 20) return 1
  if (level <= 40) return 2
  if (level <= 60) return 3
  if (level <= 80) return 4
  return 5
}

export const updateLevel = (current: number, correct: boolean): number => {
  if (correct) return Math.min(100, current + 3)
  return Math.max(1, current - 2)
}

export const getStartingLevel = (score: number): number => {
  if (score <= 2) return 5
  if (score <= 4) return 20
  if (score <= 6) return 40
  if (score <= 8) return 60
  return 80
}

export const scorePronunciation = (expected: string, got: string): number => {
  const a = expected.toLowerCase().trim()
  const b = got.toLowerCase().trim()
  if (a === b) return 1.0
  const longer = a.length > b.length ? a : b
  const shorter = a.length > b.length ? b : a
  let matches = 0
  for (let i = 0; i < shorter.length; i++) {
    if (longer.includes(shorter[i])) matches++
  }
  return matches / longer.length
}
