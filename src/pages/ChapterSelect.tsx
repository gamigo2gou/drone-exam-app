import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import type { Chapter, ChapterData, ChapterIndex } from '../types'
import { useQuizStore } from '../store/quizStore'

export default function ChapterSelect() {
  const { chapterId } = useParams<{ chapterId: string }>()
  const navigate = useNavigate()
  const [chapterMeta, setChapterMeta] = useState<Chapter | null>(null)
  const [chapter, setChapter] = useState<ChapterData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const startQuiz = useQuizStore((s) => s.startQuiz)

  useEffect(() => {
    if (!chapterId) return

    fetch('/questions/index.json', { cache: 'reload' })
      .then((r) => r.json())
      .then((index: ChapterIndex) => {
        const meta = index.chapters.find((c) => c.id === chapterId)
        if (!meta) throw new Error('章が見つかりません')
        setChapterMeta(meta)
        return fetch(`/questions/${meta.file}`, { cache: 'reload' }).then((r) => r.json())
      })
      .then(setChapter)
      .catch(() => setError('問題データの読み込みに失敗しました'))
  }, [chapterId])

  const handleStart = (mode: 'all' | 'random10') => {
    if (!chapter || !chapterId || !chapterMeta) return
    let questions = [...chapter.questions]
    if (mode === 'random10') {
      questions = questions.sort(() => Math.random() - 0.5).slice(0, 10)
    }
    startQuiz(chapterId, chapterMeta.title, questions)
    navigate('/quiz')
  }

  if (error) return <div className="p-8 text-red-500 text-center">{error}</div>
  if (!chapter) return <div className="p-8 text-center animate-pulse text-gray-400">読み込み中...</div>

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <button
        onClick={() => navigate('/')}
        className="text-blue-500 text-sm mb-6 flex items-center gap-1"
      >
        ← ホームに戻る
      </button>

      <div className="max-w-xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-1">{chapter.questions[0]?.category ?? ''}</h1>
        <p className="text-xl font-semibold text-slate-700 mb-1">{chapter.chapter}</p>
        <p className="text-gray-400 text-sm mb-8">全 {chapter.total} 問</p>

        <div className="grid gap-4">
          <button
            onClick={() => handleStart('all')}
            className="bg-blue-600 text-white rounded-2xl p-5 text-left hover:bg-blue-700 transition-colors"
          >
            <p className="font-bold text-lg">全問チャレンジ</p>
            <p className="text-blue-200 text-sm mt-1">全 {chapter.total} 問を順番に解く</p>
          </button>

          <button
            onClick={() => handleStart('random10')}
            className="bg-white border border-slate-200 text-slate-800 rounded-2xl p-5 text-left hover:shadow-md transition-shadow"
          >
            <p className="font-bold text-lg">ランダム10問</p>
            <p className="text-gray-400 text-sm mt-1">ランダムに選ばれた10問を解く</p>
          </button>
        </div>
      </div>
    </div>
  )
}
