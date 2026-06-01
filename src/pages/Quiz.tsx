import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuizStore } from '../store/quizStore'

const LABELS = ['A', 'B', 'C']

export default function Quiz() {
  const navigate = useNavigate()
  const { session, answer, nextQuestion, resetSession } = useQuizStore()
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)

  if (!session) {
    navigate('/')
    return null
  }

  if (session.finished) {
    navigate('/result')
    return null
  }

  const question = session.questions[session.currentIndex]
  const correctIndex = question.answer - 1  // 1-based → 0-based
  const progressPct = (session.currentIndex / session.questions.length) * 100

  const handleSelect = (index: number) => {
    if (answered) return
    setSelectedIndex(index)
    answer(index)
    setAnswered(true)
  }

  const handleNext = () => {
    nextQuestion()
    setSelectedIndex(null)
    setAnswered(false)
  }

  const optionClass = (index: number) => {
    const base = 'w-full text-left p-4 rounded-xl border-2 transition-all text-sm leading-relaxed'
    if (!answered) return `${base} border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50 cursor-pointer`
    if (index === correctIndex) return `${base} border-green-400 bg-green-50 text-green-800`
    if (index === selectedIndex) return `${base} border-red-400 bg-red-50 text-red-800`
    return `${base} border-slate-200 bg-white text-slate-400`
  }

  const isCorrect = answered && selectedIndex === correctIndex

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="max-w-xl mx-auto">
        {/* ヘッダー */}
        <div className="flex justify-between items-center mb-2 text-sm text-gray-400">
          <span>{session.currentIndex + 1} / {session.questions.length}</span>
          <div className="flex items-center gap-3">
            {question.difficulty && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                question.difficulty === '易' ? 'bg-green-100 text-green-600' :
                question.difficulty === '中' ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }`}>{question.difficulty}</span>
            )}
            <button
              onClick={() => { resetSession(); navigate('/') }}
              className="text-xs text-gray-400 hover:text-red-400"
            >
              中断
            </button>
          </div>
        </div>

        {/* プログレスバー */}
        <div className="h-1.5 bg-slate-200 rounded-full mb-6">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* カテゴリ */}
        {question.category && (
          <p className="text-xs text-blue-400 font-medium mb-2">
            {question.category}
            {question.subcategory ? ` › ${question.subcategory}` : ''}
          </p>
        )}

        {/* 問題文 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-4">
          <p className="text-slate-800 font-medium leading-relaxed">{question.question}</p>
        </div>

        {/* 選択肢（3択） */}
        <div className="grid gap-3 mb-4">
          {question.choices.map((choice, i) => (
            <button key={i} className={optionClass(i)} onClick={() => handleSelect(i)}>
              <span className="font-bold mr-2 text-blue-400">{LABELS[i]}.</span>
              {choice}
            </button>
          ))}
        </div>

        {/* 正誤フィードバック */}
        {answered && (
          <div className={`rounded-xl px-4 py-3 mb-4 text-sm font-bold ${isCorrect ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {isCorrect ? '正解！' : `不正解。正解は ${LABELS[correctIndex]} です。`}
          </div>
        )}

        {/* 解説 */}
        {answered && question.explanation && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-xs font-bold text-amber-700 mb-1">解説</p>
            <p className="text-sm text-amber-800 leading-relaxed">{question.explanation}</p>
          </div>
        )}

        {/* 次へボタン */}
        {answered && (
          <button
            onClick={handleNext}
            className="w-full bg-blue-600 text-white rounded-2xl py-4 font-bold text-base hover:bg-blue-700 transition-colors"
          >
            {session.currentIndex + 1 >= session.questions.length ? '結果を見る' : '次の問題'}
          </button>
        )}
      </div>
    </div>
  )
}
