import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useProgressStore, type QuestionStat } from '../store/progressStore'

const TOTAL_QUESTIONS = 300
const PASS_ACCURACY = 0.8

function formatDate(iso: string) {
  return iso.slice(0, 10)
}

function buildCalendar(year: number, month: number, studyDays: Set<string>) {
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  return { cells, firstDay, daysInMonth }
}

function dayKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function Progress() {
  const stats = useProgressStore((s) => s.stats)
  const studyLog = useProgressStore((s) => s.studyLog)
  const clearAll = useProgressStore((s) => s.clearAll)

  const today = new Date()
  const [calYear, setCalYear] = useState(today.getFullYear())
  const [calMonth, setCalMonth] = useState(today.getMonth())

  const studyDays = useMemo(() => new Set(studyLog), [studyLog])

  const allStats = useMemo(() => Object.values(stats), [stats])

  const totalSolved = useMemo(
    () => new Set(Object.keys(stats)).size,
    [stats]
  )

  const overallAccuracy = useMemo(() => {
    const totalAttempts = allStats.reduce((s, q) => s + q.attempts, 0)
    const totalCorrect = allStats.reduce((s, q) => s + q.correct, 0)
    return totalAttempts > 0 ? totalCorrect / totalAttempts : null
  }, [allStats])

  const chapterStats = useMemo(() => {
    const map = new Map<string, { title: string; attempts: number; correct: number; solved: number }>()
    for (const q of allStats) {
      const prev = map.get(q.chapterId) ?? { title: q.chapterTitle, attempts: 0, correct: 0, solved: 0 }
      map.set(q.chapterId, {
        title: q.chapterTitle,
        attempts: prev.attempts + q.attempts,
        correct: prev.correct + q.correct,
        solved: prev.solved + 1,
      })
    }
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, ...v, accuracy: v.attempts > 0 ? v.correct / v.attempts : null }))
      .sort((a, b) => a.id.localeCompare(b.id))
  }, [allStats])

  const weakQuestions = useMemo(() => {
    return allStats
      .filter((q) => q.attempts >= 2 && q.correct / q.attempts <= 0.5)
      .sort((a, b) => a.correct / a.attempts - b.correct / b.attempts)
      .slice(0, 20)
  }, [allStats])

  const estimatedDays = useMemo(() => {
    if (overallAccuracy === null) return null
    if (overallAccuracy >= PASS_ACCURACY) return 0
    const totalAnswered = allStats.reduce((s, q) => s + q.attempts, 0)
    if (totalAnswered < 10) return null
    const weakCount = allStats.filter((q) => q.attempts >= 2 && q.correct / q.attempts < PASS_ACCURACY).length
    if (weakCount === 0) return 0
    // Assume ~15 weak questions mastered per study session
    return Math.ceil(weakCount / 15)
  }, [overallAccuracy, allStats])

  const { cells } = buildCalendar(calYear, calMonth, studyDays)

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0) }
    else setCalMonth(m => m + 1)
  }

  const MONTH_NAMES = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
  const WEEKDAYS = ['日','月','火','水','木','金','土']

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/" className="text-blue-500 text-sm">← ホーム</Link>
          <h1 className="text-xl font-bold text-slate-800">学習進捗</h1>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{totalSolved}</p>
            <p className="text-xs text-gray-400 mt-0.5">問 解答済</p>
            <p className="text-xs text-gray-300">/ {TOTAL_QUESTIONS}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 text-center">
            <p className={`text-2xl font-bold ${
              overallAccuracy === null ? 'text-gray-300'
              : overallAccuracy >= PASS_ACCURACY ? 'text-green-500'
              : 'text-orange-400'
            }`}>
              {overallAccuracy !== null ? `${Math.round(overallAccuracy * 100)}%` : '—'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">総合正答率</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 text-center">
            <p className="text-2xl font-bold text-indigo-500">{studyLog.length}</p>
            <p className="text-xs text-gray-400 mt-0.5">学習日数</p>
          </div>
        </div>

        {/* Estimated pass date */}
        <div className={`rounded-2xl p-4 mb-6 ${
          estimatedDays === null ? 'bg-slate-100'
          : estimatedDays === 0 ? 'bg-green-50 border border-green-200'
          : 'bg-amber-50 border border-amber-200'
        }`}>
          <p className="text-xs font-medium text-gray-500 mb-1">合格目安</p>
          {estimatedDays === null ? (
            <p className="text-sm text-gray-400">まだデータが少ないです。問題を解くと表示されます。</p>
          ) : estimatedDays === 0 ? (
            <p className="text-base font-bold text-green-600">現在の実力で合格圏内です！</p>
          ) : (
            <p className="text-base font-bold text-amber-700">
              あと約 <span className="text-2xl">{estimatedDays}</span> 日の学習で合格圏内の見込み
            </p>
          )}
        </div>

        {/* Chapter proficiency */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
          <h2 className="text-sm font-bold text-slate-700 mb-4">章別習熟度</h2>
          {chapterStats.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">まだデータがありません</p>
          ) : (
            <div className="space-y-4">
              {chapterStats.map((ch) => {
                const pct = ch.accuracy !== null ? Math.round(ch.accuracy * 100) : null
                return (
                  <div key={ch.id}>
                    <div className="flex justify-between items-baseline mb-1">
                      <p className="text-xs text-slate-600 truncate max-w-[75%]">{ch.title}</p>
                      <p className={`text-sm font-bold ${
                        pct === null ? 'text-gray-300'
                        : pct >= 80 ? 'text-green-500'
                        : pct >= 60 ? 'text-amber-500'
                        : 'text-red-400'
                      }`}>
                        {pct !== null ? `${pct}%` : '未学習'}
                      </p>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          pct === null ? ''
                          : pct >= 80 ? 'bg-green-400'
                          : pct >= 60 ? 'bg-amber-400'
                          : 'bg-red-400'
                        }`}
                        style={{ width: pct !== null ? `${pct}%` : '0%' }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{ch.solved} 問解答</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Study calendar */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="text-gray-400 hover:text-gray-600 px-2 py-1 text-sm">‹</button>
            <h2 className="text-sm font-bold text-slate-700">{calYear}年 {MONTH_NAMES[calMonth]}</h2>
            <button onClick={nextMonth} className="text-gray-400 hover:text-gray-600 px-2 py-1 text-sm">›</button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((d, i) => (
              <div key={d} className={`text-center text-xs font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'}`}>
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />
              const key = dayKey(calYear, calMonth, day)
              const studied = studyDays.has(key)
              const isToday = key === today.toISOString().slice(0, 10)
              return (
                <div
                  key={key}
                  className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium
                    ${studied ? 'bg-blue-500 text-white'
                    : isToday ? 'bg-slate-100 text-slate-800 ring-1 ring-blue-300'
                    : 'text-slate-400'}`}
                >
                  {day}
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-3 text-right">
            学習日: <span className="text-blue-500 font-medium">{studyLog.length}</span> 日間
          </p>
        </div>

        {/* Weak questions */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
          <h2 className="text-sm font-bold text-slate-700 mb-3">
            苦手問題リスト
            <span className="text-xs text-gray-400 font-normal ml-2">正答率50%以下・2回以上</span>
          </h2>
          {weakQuestions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              {allStats.length === 0 ? 'まだデータがありません' : '苦手問題はありません'}
            </p>
          ) : (
            <div className="space-y-2">
              {weakQuestions.map((q, i) => {
                const pct = Math.round((q.correct / q.attempts) * 100)
                return (
                  <div key={i} className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0">
                    <span className={`shrink-0 mt-0.5 text-xs font-bold px-1.5 py-0.5 rounded ${
                      pct === 0 ? 'bg-red-100 text-red-500'
                      : pct <= 25 ? 'bg-orange-100 text-orange-500'
                      : 'bg-amber-100 text-amber-600'
                    }`}>
                      {pct}%
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-600 line-clamp-2">{q.questionText}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {q.chapterTitle.split(' ').slice(0, 2).join(' ')} · {q.attempts}回挑戦
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Clear data */}
        <div className="text-center pb-8">
          <button
            onClick={() => {
              if (confirm('学習データをすべてリセットしますか？')) clearAll()
            }}
            className="text-xs text-gray-400 hover:text-red-400 transition-colors"
          >
            学習データをリセット
          </button>
        </div>
      </div>
    </div>
  )
}
