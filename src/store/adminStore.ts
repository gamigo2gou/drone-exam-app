import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ReviewStatus = 'OK' | '修正済み' | '要確認'

export interface ReviewOverride {
  answer?: number       // 1-based, only if changed from original
  status?: ReviewStatus
}

interface AdminStore {
  reviews: Record<string, ReviewOverride>   // key = questionId
  setAnswer: (questionId: string, answer: number) => void
  setStatus: (questionId: string, status: ReviewStatus) => void
  clearAll: () => void
}

export const useAdminStore = create<AdminStore>()(
  persist(
    (set, get) => ({
      reviews: {},

      setAnswer: (questionId, answer) => {
        const { reviews } = get()
        set({ reviews: { ...reviews, [questionId]: { ...reviews[questionId], answer } } })
      },

      setStatus: (questionId, status) => {
        const { reviews } = get()
        set({ reviews: { ...reviews, [questionId]: { ...reviews[questionId], status } } })
      },

      clearAll: () => set({ reviews: {} }),
    }),
    { name: 'drone-admin-reviews' }
  )
)
