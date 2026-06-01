import { useNavigate } from 'react-router-dom'
import { useQuizStore } from '../store/quizStore'

const LABELS = ['A', 'B', 'C']

export default function Result() {
  const navigate = useNavigate()
  const { session, resetSession } = useQuizStore()

  if (!session || !session.finished) {
    navigate('/')
    return null
  }

  const correctCount = session.results.filter((r) => r.correct).length
  const total = session.questions.length
  const rate = Math.round((correctCount / total) * 100)
  const passed = rate >= 70

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-xl mx-auto">
        {/* スコアカード */}
        <div className={`rounded-3xl p-8 text-center mb-6 ${passed ? 'bg-green-500' : 'bg-orange-400'}`}>
          <p className="text-white text-sm font-medium mb-1">正答率</p>
          <p className="text-white text-6xl font-bold">{rate}%</p>
          <p className="text-white opacity-80 mt-2">{correctCount} / {total} 問正解</p>
          <p className="text-white font-bold text-lg mt-3">
            {passed ? '合格ライン達成！' : 'もう一度チャレンジ！'}
          </p>
        </div>

        {/* 問題別結果 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
          <h2 className="font-bold text-slate-700 mb-3 text-sm">問題別結果</h2>
          <div className="grid gap-2">
            {session.results.map((r, i) => {
              const q = session.questions[i]
              const correctLabel = LABELS[q.answer - 1]  // 1-based → label
              return (
                <div key={r.questionId} className="flex items-start gap-3 text-sm">
                  <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${r.correct ? 'bg-green-400' : 'bg-red-400'}`}>
                    {r.correct ? '○' : '×'}
                  </span>
                  <div className="min-w-0">
                    <span className="text-slate-600 line-clamp-1">問 {i + 1}. {q.question}</span>
                    {!r.correct && (
                      <span className="text-red-400 text-xs block">
                        あなた: {LABELS[r.selected]} → 正解: {correctLabel}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ボタン */}
        <div className="grid gap-3">
          <button
            onClick={() => { resetSession(); navigate(`/chapter/${session.chapterId}`) }}
            className="w-full bg-blue-600 text-white rounded-2xl py-4 font-bold hover:bg-blue-700 transition-colors"
          >
            もう一度挑戦
          </button>
          <button
            onClick={() => { resetSession(); navigate('/') }}
            className="w-full bg-white border border-slate-200 text-slate-700 rounded-2xl py-4 font-bold hover:shadow-md transition-shadow"
          >
            ホームに戻る
          </button>
        </div>
      </div>
    </div>
  )
}
