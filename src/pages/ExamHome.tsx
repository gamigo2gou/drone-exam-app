import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ChapterIndex, ChapterData } from '../types'
import type { ExamQuestion } from '../types'
import { useExamStore } from '../store/examStore'

// 各章から抽出する問題数（index.jsonのchapters配列の順に対応）
const DISTRIBUTION = [13, 22, 5, 10]

const CHAPTER_COLORS = [
  'bg-blue-50 text-blue-600',
  'bg-purple-50 text-purple-600',
  'bg-green-50 text-green-600',
  'bg-orange-50 text-orange-600',
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function ExamHome() {
  const navigate = useNavigate()
  const { history, startExam, resetSession } = useExamStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleStart = async () => {
    setLoading(true)
    setError(null)
    try {
      const index: ChapterIndex = await fetch('/questions/index.json', { cache: 'reload' }).then(r => r.json())

      const chapterDataList: ChapterData[] = await Promise.all(
        index.chapters.map(ch =>
          fetch(`/questions/${ch.file}`, { cache: 'reload' }).then(r => r.json())
        )
      )

      const examQuestions: ExamQuestion[] = []
      chapterDataList.forEach((data, i) => {
        const ch = index.chapters[i]
        const count = DISTRIBUTION[i] ?? 0
        const picked = shuffle(data.questions).slice(0, count)
        picked.forEach(q => examQuestions.push({ ...q, chapterId: ch.id, chapterTitle: ch.title }))
      })

      resetSession()
      startExam(shuffle(examQuestions))
      navigate('/exam/quiz')
    } catch {
      setError('問題データの読み込みに失敗しました。再度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <button onClick={() => navigate('/')} className="text-blue-500 text-sm mb-6 flex items-center gap-1">
        ← ホームに戻る
      </button>

      <div className="max-w-xl mx-auto">
        <header className="text-center mb-8">
          <p className="text-5xl mb-3">📋</p>
          <h1 className="text-2xl font-bold text-slate-800">模擬試験</h1>
          <p className="text-gray-500 text-sm mt-1">本番形式の模擬試験に挑戦しましょう</p>
        </header>

        {/* 試験概要 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <h2 className="font-bold text-slate-700 mb-3 text-sm">試験の概要</h2>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              ['出題数', '50問'],
              ['制限時間', '30分'],
              ['合格基準', '80%以上'],
              ['合格点', '40問以上'],
            ].map(([label, value]) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3">
                <p className="text-xs text-gray-400">{label}</p>
                <p className="font-bold text-slate-800 text-lg">{value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 font-medium mb-2">出題比率</p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            {['規則 13問 (25%)', 'システム 22問 (45%)', '操縦者 5問 (10%)', 'リスク管理 10問 (20%)'].map(
              (label, i) => (
                <span key={i} className={`rounded-lg px-2 py-1 ${CHAPTER_COLORS[i]}`}>{label}</span>
              )
            )}
          </div>
        </div>

        {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}

        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full bg-blue-600 text-white rounded-2xl py-4 font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-50 mb-8"
        >
          {loading ? '読み込み中...' : '試験を開始する →'}
        </button>

        {/* 受験履歴 */}
        {history.length > 0 && (
          <div>
            <h2 className="font-bold text-slate-700 mb-3 text-sm">受験履歴（最新10件）</h2>
            <div className="grid gap-2">
              {history.map((rec, i) => {
                const rate = Math.round((rec.score / 50) * 100)
                return (
                  <div key={rec.id} className="bg-white rounded-xl border border-slate-200 p-4 flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-400">{i === 0 ? '最新 · ' : ''}{formatDate(rec.date)}</p>
                      <p className="font-bold text-slate-800 mt-0.5">
                        {rec.score}/50問
                        <span className="text-gray-400 font-normal text-sm ml-2">({rate}%)</span>
                      </p>
                    </div>
                    <span className={`text-sm font-bold px-3 py-1 rounded-full ${rec.passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                      {rec.passed ? '合格' : '不合格'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
