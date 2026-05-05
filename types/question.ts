export type Band = 1 | 2 | 3 | 4 | 5

export type McqQuestion = {
  id: string
  type: 'mcq'
  skill: string
  band: Band
  question: string
  gujaratiText: string
  options: [string, string, string, string]
  answer: string
  answerGujarati: string
  explanation: string
  pronunciationTarget: null
}

export type PronunciationQuestion = {
  id: string
  type: 'pronunciation'
  skill: string
  band: Band
  question: string
  gujaratiText: string
  options: null
  answer: null
  answerGujarati: string
  explanation: string
  pronunciationTarget: string
}

export type QuizQuestion = McqQuestion | PronunciationQuestion
