import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Question, QuizResult } from '../types'
import { useProgressStore } from './progressStore'

interface QuizSession {
  chapterId: string
  chapterTitle: string
  questions: Question[]
  currentIndex: number
  results: QuizResult[]
  finished: boolean
}

interface Progress {
  [chapterId: string]: {
    totalAttempts: number
    correctCount: number
    lastAttemptAt: string
  }
}

interface QuizStore {
  session: QuizSession | null
  progress: Progress
  startQuiz: (chapterId: string, chapterTitle: string, questions: Question[]) => void
  answer: (selected: number) => void  // selected は 0-based
  nextQuestion: () => void
  resetSession: () => void
}

export const useQuizStore = create<QuizStore>()(
  persist(
    (set, get) => ({
      session: null,
      progress: {},

      startQuiz: (chapterId, chapterTitle, questions) => {
        set({
          session: {
            chapterId,
            chapterTitle,
            questions,
            currentIndex: 0,
            results: [],
            finished: false,
          },
        })
      },

      answer: (selected) => {
        const { session } = get()
        if (!session || session.finished) return
        const question = session.questions[session.currentIndex]
        const correct = selected + 1 === question.answer
        useProgressStore.getState().recordAttempt({
          questionId: question.id,
          chapterId: session.chapterId,
          chapterTitle: session.chapterTitle,
          questionText: question.question,
          isCorrect: correct,
        })
        set((state) => ({
          session: state.session
            ? {
                ...state.session,
                results: [
                  ...state.session.results,
                  { questionId: question.id, selected, correct },
                ],
              }
            : null,
        }))
      },

      nextQuestion: () => {
        const { session, progress } = get()
        if (!session) return
        const nextIndex = session.currentIndex + 1
        const finished = nextIndex >= session.questions.length

        if (finished) {
          const correctCount = session.results.filter((r) => r.correct).length
          const prev = progress[session.chapterId]
          set({
            session: { ...session, currentIndex: nextIndex, finished: true },
            progress: {
              ...progress,
              [session.chapterId]: {
                totalAttempts: (prev?.totalAttempts ?? 0) + session.questions.length,
                correctCount: (prev?.correctCount ?? 0) + correctCount,
                lastAttemptAt: new Date().toISOString(),
              },
            },
          })
        } else {
          set({ session: { ...session, currentIndex: nextIndex } })
        }
      },

      resetSession: () => set({ session: null }),
    }),
    { name: 'drone-quiz-store', partialize: (state) => ({ progress: state.progress }) }
  )
)
