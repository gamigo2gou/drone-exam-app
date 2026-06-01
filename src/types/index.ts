export interface Question {
  id: string
  category: string
  subcategory: string
  difficulty: string
  question: string
  choices: string[]
  answer: number        // 1-based (1, 2, or 3)
  explanation: string
  wrong_choice_reasons?: Record<string, string>
}

export interface Chapter {
  id: string
  title: string
  file: string
  questions: number     // 問題数
  ratio?: string
}

export interface ChapterIndex {
  chapters: Chapter[]
}

export interface ChapterData {
  version?: string
  chapter: string
  total: number
  questions: Question[]
}

export interface QuizResult {
  questionId: string
  selected: number      // 0-based (ユーザーが選んだインデックス)
  correct: boolean
}

export interface ExamQuestion extends Question {
  chapterId: string
  chapterTitle: string
}

export interface ExamChapterResult {
  chapterId: string
  chapterTitle: string
  correct: number
  total: number
}

export interface ExamRecord {
  id: string
  date: string
  score: number
  passed: boolean
  timeUsedSeconds: number
  chapterBreakdown: ExamChapterResult[]
}
