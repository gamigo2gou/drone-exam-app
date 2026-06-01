import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface QuestionStat {
  chapterId: string
  chapterTitle: string
  questionText: string   // 先頭60文字
  attempts: number
  correct: number
  lastAttempted: string  // YYYY-MM-DD
}

interface ProgressStore {
  stats: Record<string, QuestionStat>  // key = questionId
  studyLog: string[]                   // 学習した日の YYYY-MM-DD（重複なし）
  recordAttempt: (p: {
    questionId: string
    chapterId: string
    chapterTitle: string
    questionText: string
    isCorrect: boolean
  }) => void
  clearAll: () => void
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      stats: {},
      studyLog: [],

      recordAttempt: ({ questionId, chapterId, chapterTitle, questionText, isCorrect }) => {
        const { stats, studyLog } = get()
        const prev = stats[questionId]
        const today = todayStr()
        set({
          stats: {
            ...stats,
            [questionId]: {
              chapterId,
              chapterTitle,
              questionText: questionText.slice(0, 60),
              attempts: (prev?.attempts ?? 0) + 1,
              correct: (prev?.correct ?? 0) + (isCorrect ? 1 : 0),
              lastAttempted: today,
            },
          },
          studyLog: studyLog.includes(today) ? studyLog : [...studyLog, today],
        })
      },

      clearAll: () => set({ stats: {}, studyLog: [] }),
    }),
    { name: 'drone-progress-store' }
  )
)
