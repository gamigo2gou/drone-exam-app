import { useEffect, useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ChapterIndex } from '../types'
import { useQuizStore } from '../store/quizStore'
import { useExamStore } from '../store/examStore'
import { useProgressStore } from '../store/progressStore'

export default function Home() {
  const [chapterIndex, setChapterIndex] = useState<ChapterIndex | null>(null)
  const [error, setError] = useState<string | null>(null)
  const progress = useQuizStore((s) => s.progress)
  const examHistory = useExamStore((s) => s.history)
  const latestExam = examHistory[0]
  const progressStats = useProgressStore((s) => s.stats)
  const studyLog = useProgressStore((s) => s.studyLog)

  const { solvedCount, overallAccuracy } = useMemo(() => {
    const vals = Object.values(progressStats)
    const totalAttempts = vals.reduce((s, q) => s + q.attempts, 0)
    const totalCorrect = vals.reduce((s, q) => s + q.correct, 0)
    return {
      solvedCount: vals.length,
      overallAccuracy: totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null,
    }
  }, [progressStats])

  useEffect(() => {
    fetch('/questions/index.json', { cache: 'reload' })
      .then((r) => r.json())
      .then(setChapterIndex)
      .catch(() => setError('問題データの読み込みに失敗しました'))
  }, [])

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  if (!chapterIndex) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-400 animate-pulse">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <header className="text-center mb-10">
        <h1 className="text-2xl font-bold text-blue-800">二等無人航空機操縦士</h1>
        <p className="text-gray-500 mt-1">学科試験対策アプリ</p>
      </header>

      {/* 模擬試験バナー */}
      <div className="max-w-xl mx-auto mb-4">
        <Link
          to="/exam"
          className="block bg-blue-600 rounded-2xl p-5 hover:bg-blue-700 transition-colors"
        >
          <div className="flex justify-between items-center">
            <div>
              <p className="text-blue-200 text-xs font-medium">本番形式</p>
              <p className="text-white font-bold text-lg mt-0.5">模擬試験を受ける</p>
              <p className="text-blue-200 text-xs mt-1">50問 · 30分 · 合格基準80%</p>
            </div>
            <div className="text-right">
              {latestExam ? (
                <>
                  <p className={`text-lg font-bold ${latestExam.passed ? 'text-green-300' : 'text-red-300'}`}>
                    {latestExam.passed ? '合格' : '不合格'}
                  </p>
                  <p className="text-blue-200 text-xs">{latestExam.score}/50問</p>
                </>
              ) : (
                <p className="text-blue-300 text-sm">未受験</p>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* Progress summary card */}
      <div className="max-w-xl mx-auto mb-4">
        <Link
          to="/progress"
          className="block bg-white rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow"
        >
          <div className="flex justify-between items-center">
            <p className="text-sm font-semibold text-slate-700">学習進捗</p>
            <span className="text-xs text-blue-500">詳細 →</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="text-center">
              <p className="text-xl font-bold text-blue-600">{solvedCount}</p>
              <p className="text-xs text-gray-400">解答問題数</p>
            </div>
            <div className="text-center">
              <p className={`text-xl font-bold ${
                overallAccuracy === null ? 'text-gray-300'
                : overallAccuracy >= 80 ? 'text-green-500'
                : 'text-orange-400'
              }`}>
                {overallAccuracy !== null ? `${overallAccuracy}%` : '—'}
              </p>
              <p className="text-xs text-gray-400">正答率</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-indigo-500">{studyLog.length}</p>
              <p className="text-xs text-gray-400">学習日数</p>
            </div>
          </div>
        </Link>
      </div>

      <div className="max-w-xl mx-auto grid gap-4">
        {chapterIndex.chapters.map((chapter) => {
          const p = progress[chapter.id]
          const rate = p && p.totalAttempts > 0
            ? Math.round((p.correctCount / p.totalAttempts) * 100)
            : null

          return (
            <Link
              key={chapter.id}
              to={`/chapter/${chapter.id}`}
              className="block bg-white rounded-2xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-blue-500 font-medium uppercase tracking-wide">
                    {chapter.title.split(' ')[0]}
                  </p>
                  <h2 className="text-lg font-semibold text-slate-800 mt-0.5">
                    {chapter.title}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    {chapter.questions} 問
                    {chapter.ratio ? ` · 出題比率 ${chapter.ratio}` : ''}
                  </p>
                </div>
                {rate !== null ? (
                  <div className="text-right">
                    <span className={`text-2xl font-bold ${rate >= 70 ? 'text-green-500' : 'text-orange-400'}`}>
                      {rate}%
                    </span>
                    <p className="text-xs text-gray-400">正答率</p>
                  </div>
                ) : (
                  <span className="text-sm text-gray-300">未挑戦</span>
                )}
              </div>
              {rate !== null && (
                <div className="mt-3 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${rate >= 70 ? 'bg-green-400' : 'bg-orange-400'}`}
                    style={{ width: `${rate}%` }}
                  />
                </div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
