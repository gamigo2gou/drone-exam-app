import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ExamQuestion, ExamRecord, ExamChapterResult } from '../types'
import { useProgressStore } from './progressStore'

const TOTAL_TIME = 30 * 60   // 1800秒
const PASS_SCORE = 40        // 40/50 = 80%

export interface ExamSession {
  questions: ExamQuestion[]
  answers: (number | null)[]  // 0-based。未回答はnull
  currentIndex: number
  startedAt: string
  timeRemaining: number
  finished: boolean
}

interface ExamStore {
  session: ExamSession | null
  history: ExamRecord[]
  startExam: (questions: ExamQuestion[]) => void
  selectAnswer: (questionIndex: number, choiceIndex: number) => void
  goTo: (index: number) => void
  tick: () => void
  finish: () => void
  resetSession: () => void
}

export const useExamStore = create<ExamStore>()(
  persist(
    (set, get) => ({
      session: null,
      history: [],

      startExam: (questions) =>
        set({
          session: {
            questions,
            answers: Array(questions.length).fill(null),
            currentIndex: 0,
            startedAt: new Date().toISOString(),
            timeRemaining: TOTAL_TIME,
            finished: false,
          },
        }),

      selectAnswer: (questionIndex, choiceIndex) => {
        const { session } = get()
        if (!session || session.finished) return
        const answers = [...session.answers]
        answers[questionIndex] = choiceIndex
        set({ session: { ...session, answers } })
      },

      goTo: (index) => {
        const { session } = get()
        if (!session || session.finished) return
        if (index < 0 || index >= session.questions.length) return
        set({ session: { ...session, currentIndex: index } })
      },

      tick: () => {
        const { session, finish } = get()
        if (!session || session.finished) return
        if (session.timeRemaining <= 1) {
          finish()
        } else {
          set({ session: { ...session, timeRemaining: session.timeRemaining - 1 } })
        }
      },

      finish: () => {
        const { session, history } = get()
        if (!session || session.finished) return

        const timeUsedSeconds = TOTAL_TIME - session.timeRemaining
        let score = 0
        const chapterMap = new Map<string, { title: string; correct: number; total: number }>()

        session.questions.forEach((q, i) => {
          const selected = session.answers[i]
          const correct = selected !== null && selected + 1 === q.answer
          if (correct) score++

          const entry = chapterMap.get(q.chapterId) ?? { title: q.chapterTitle, correct: 0, total: 0 }
          entry.total++
          if (correct) entry.correct++
          chapterMap.set(q.chapterId, entry)

          if (selected !== null) {
            useProgressStore.getState().recordAttempt({
              questionId: q.id,
              chapterId: q.chapterId,
              chapterTitle: q.chapterTitle,
              questionText: q.question,
              isCorrect: correct,
            })
          }
        })

        const chapterBreakdown: ExamChapterResult[] = Array.from(chapterMap.entries()).map(
          ([chapterId, v]) => ({ chapterId, chapterTitle: v.title, correct: v.correct, total: v.total })
        )

        const record: ExamRecord = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          score,
          passed: score >= PASS_SCORE,
          timeUsedSeconds,
          chapterBreakdown,
        }

        set({
          session: { ...session, finished: true },
          history: [record, ...history].slice(0, 10),
        })
      },

      resetSession: () => set({ session: null }),
    }),
    {
      name: 'drone-exam-history',
      partialize: (state) => ({ history: state.history }),
    }
  )
)
