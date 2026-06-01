import { Navigate, useNavigate } from 'react-router-dom'
import { useExamStore } from '../store/examStore'

const LABELS = ['A', 'B', 'C']
const PASS_SCORE = 40

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}分${String(s).padStart(2, '0')}秒`
}

export default function ExamResult() {
  const navigate = useNavigate()
  const { session, history, resetSession } = useExamStore()

  if (!session?.finished) return <Navigate to="/exam" replace />

  const record = history[0]
  if (!record) return <Navigate to="/exam" replace />

  const { score, passed, timeUsedSeconds, chapterBreakdown } = record
  const total = session.questions.length
  const rate = Math.round((score / total) * 100)

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-xl mx-auto">

        {/* スコアカード */}
        <div className={`rounded-3xl p-8 text-center mb-6 ${passed ? 'bg-green-500' : 'bg-red-500'}`}>
          <p className="text-white font-bold text-xl mb-1">{passed ? '合格' : '不合格'}</p>
          <p className="text-white opacity-70 text-sm">{passed ? `合格基準 ${PASS_SCORE}問以上 達成` : `合格まであと ${PASS_SCORE - score}問`}</p>
          <div className="my-4">
            <span className="text-white text-6xl font-bold">{score}</span>
            <span className="text-white text-2xl opacity-70"> / {total}問</span>
          </div>
          <p className="text-white opacity-80">正答率 {rate}%　·　所要時間 {formatTime(timeUsedSeconds)}</p>
        </div>

        {/* 章ごとの正答率 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4">
          <h2 className="font-bold text-slate-700 mb-4 text-sm">章ごとの正答率</h2>
          <div className="grid gap-4">
            {chapterBreakdown.map(ch => {
              const chRate = Math.round((ch.correct / ch.total) * 100)
              const ok = chRate >= 80
              return (
                <div key={ch.chapterId}>
                  <div className="flex justify-between items-baseline mb-1">
                    <p className="text-sm text-slate-600 truncate pr-2">{ch.chapterTitle}</p>
                    <p className={`text-sm font-bold shrink-0 ${ok ? 'text-green-500' : 'text-orange-400'}`}>
                      {ch.correct}/{ch.total}問 ({chRate}%)
                    </p>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${ok ? 'bg-green-400' : 'bg-orange-400'}`}
                      style={{ width: `${chRate}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 問題別正誤一覧 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
          <h2 className="font-bold text-slate-700 mb-3 text-sm">問題別正誤</h2>
          <div className="grid gap-2 max-h-72 overflow-y-auto pr-1">
            {session.questions.map((q, i) => {
              const selected = session.answers[i]
              const correct = selected !== null && selected + 1 === q.answer
              return (
                <div key={q.id} className="flex items-start gap-2 text-xs">
                  <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-white font-bold text-[10px] ${correct ? 'bg-green-400' : 'bg-red-400'}`}>
                    {correct ? '○' : '×'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-500 line-clamp-1">問{i + 1}. {q.question}</p>
                    {!correct && (
                      <p className="text-red-400 mt-0.5">
                        {selected !== null ? `あなた: ${LABELS[selected]}` : '未回答'} → 正解: {LABELS[q.answer - 1]}
                      </p>
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
            onClick={() => { resetSession(); navigate('/exam') }}
            className="w-full bg-blue-600 text-white rounded-2xl py-4 font-bold hover:bg-blue-700 transition-colors"
          >
            もう一度受験する
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
