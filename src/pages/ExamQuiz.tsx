import { useEffect, useRef } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useExamStore } from '../store/examStore'

const LABELS = ['A', 'B', 'C']

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function ExamQuiz() {
  const navigate = useNavigate()
  const { session, selectAnswer, goTo, tick, finish } = useExamStore()

  // tickの参照をRefで保持（setIntervalのクロージャ問題を回避）
  const tickRef = useRef(tick)
  tickRef.current = tick

  // カウントダウンタイマー
  useEffect(() => {
    if (!session || session.finished) return
    const id = setInterval(() => tickRef.current(), 1000)
    return () => clearInterval(id)
  }, [session?.finished])  // finishedが変わったときだけ再設定

  if (!session) return <Navigate to="/exam" replace />
  if (session.finished) return <Navigate to="/exam/result" replace />

  const question = session.questions[session.currentIndex]
  const selectedAnswer = session.answers[session.currentIndex]
  const answeredCount = session.answers.filter(a => a !== null).length
  const isLowTime = session.timeRemaining <= 300  // 残り5分以下

  const handleFinish = () => {
    if (window.confirm(`試験を終了しますか？\n未回答: ${session.questions.length - answeredCount}問（不正解扱い）`)) {
      finish()
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 固定ヘッダー：タイマー・進捗 */}
      <div className={`sticky top-0 z-10 border-b px-4 py-3 ${isLowTime ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div className="text-center">
            <p className="text-xs text-gray-400">回答済み</p>
            <p className="font-bold text-slate-800 text-sm">{answeredCount}<span className="font-normal text-gray-400">/{session.questions.length}</span></p>
          </div>

          <div className={`font-mono font-bold text-2xl tabular-nums px-4 py-1 rounded-full ${
            isLowTime ? 'text-red-600 bg-red-100 animate-pulse' : 'text-slate-800'
          }`}>
            {formatTime(session.timeRemaining)}
          </div>

          <button
            onClick={handleFinish}
            className="text-xs text-gray-400 hover:text-red-500 border border-slate-200 rounded-lg px-3 py-1.5 transition-colors"
          >
            終了
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-5">
        {/* 問題番号グリッド */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {session.questions.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                i === session.currentIndex
                  ? 'bg-blue-600 text-white shadow-sm'
                  : session.answers[i] !== null
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-white border border-slate-200 text-gray-400 hover:border-blue-300'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* カテゴリ */}
        <p className="text-xs text-blue-400 font-medium mb-2">
          {question.category}{question.subcategory ? ` › ${question.subcategory}` : ''}
        </p>

        {/* 問題文 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4 shadow-sm">
          <p className="text-xs text-gray-400 mb-2">問題 {session.currentIndex + 1}</p>
          <p className="text-slate-800 font-medium leading-relaxed">{question.question}</p>
        </div>

        {/* 選択肢（解答前後ともフィードバックなし） */}
        <div className="grid gap-3 mb-6">
          {question.choices.map((choice, i) => (
            <button
              key={i}
              onClick={() => selectAnswer(session.currentIndex, i)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all text-sm leading-relaxed ${
                selectedAnswer === i
                  ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50'
              }`}
            >
              <span className={`font-bold mr-2 ${selectedAnswer === i ? 'text-blue-600' : 'text-gray-400'}`}>
                {LABELS[i]}.
              </span>
              {choice}
            </button>
          ))}
        </div>

        {/* 前へ / 次へ */}
        <div className="flex gap-3">
          <button
            onClick={() => goTo(session.currentIndex - 1)}
            disabled={session.currentIndex === 0}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium disabled:opacity-30 hover:bg-slate-50 transition-colors"
          >
            ← 前へ
          </button>
          {session.currentIndex < session.questions.length - 1 ? (
            <button
              onClick={() => goTo(session.currentIndex + 1)}
              className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              次へ →
            </button>
          ) : (
            <button
              onClick={() => { navigate('/exam/result'); finish() }}
              className="flex-1 py-3 rounded-xl bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
            >
              提出する ✓
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
