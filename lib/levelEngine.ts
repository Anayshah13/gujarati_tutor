export const getBand = (level: number): number => {
  if (level <= 20) return 1
  if (level <= 40) return 2
  if (level <= 60) return 3
  if (level <= 80) return 4
  return 5
}

export const getBandLabel = (level: number): string => {
  const labels = ['', 'Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert']
  return labels[getBand(level)] ?? 'Beginner'
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

export const shouldUsHardcoded = (questionsAnsweredAtBand: number): boolean => {
  return questionsAnsweredAtBand < 2
}
