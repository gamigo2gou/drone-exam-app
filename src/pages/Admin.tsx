import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import type { ChapterIndex, ChapterData, ExamQuestion } from '../types'
import { useAdminStore, type ReviewStatus } from '../store/adminStore'

const PASSWORD = 'drone2024'
const LABELS = ['A', 'B', 'C']
const STATUS_LIST: ReviewStatus[] = ['OK', '修正済み', '要確認']
const STATUS_COLOR: Record<ReviewStatus, string> = {
  'OK':    'bg-green-500 text-white',
  '修正済み': 'bg-amber-500 text-white',
  '要確認':  'bg-red-500 text-white',
}
const STATUS_BADGE: Record<ReviewStatus, string> = {
  'OK':    'bg-green-900 text-green-300',
  '修正済み': 'bg-amber-900 text-amber-300',
  '要確認':  'bg-red-900 text-red-300',
}

export default function Admin() {
  const [authed, setAuthed]             = useState(false)
  const [pw, setPw]                     = useState('')
  const [pwError, setPwError]           = useState(false)
  const [allQuestions, setAllQuestions] = useState<ExamQuestion[]>([])
  const [chapters, setChapters]         = useState<{ id: string; title: string }[]>([])
  const [loading, setLoading]           = useState(false)
  const [filterChapterId, setFilterChapterId] = useState('all')
  const [currentIndex, setCurrentIndex] = useState(0)

  const reviews   = useAdminStore((s) => s.reviews)
  const setAnswer = useAdminStore((s) => s.setAnswer)
  const setStatus = useAdminStore((s) => s.setStatus)

  const handleLogin = () => {
    if (pw === PASSWORD) { setAuthed(true); setPwError(false) }
    else setPwError(true)
  }

  useEffect(() => {
    if (!authed) return
    setLoading(true)
    fetch('/questions/index.json', { cache: 'reload' })
      .then((r) => r.json())
      .then(async (index: ChapterIndex) => {
        setChapters(index.chapters.map((c) => ({ id: c.id, title: c.title })))
        const all: ExamQuestion[] = []
        for (const ch of index.chapters) {
          const data: ChapterData = await fetch(`/questions/${ch.file}`, { cache: 'reload' }).then((r) => r.json())
          for (const q of data.questions) {
            all.push({ ...q, chapterId: ch.id, chapterTitle: ch.title })
          }
        }
        setAllQuestions(all)
        setLoading(false)
      })
  }, [authed])

  const filtered = useMemo(
    () => filterChapterId === 'all' ? allQuestions : allQuestions.filter((q) => q.chapterId === filterChapterId),
    [allQuestions, filterChapterId]
  )

  useEffect(() => { setCurrentIndex(0) }, [filterChapterId])

  const totalReviewedCount = useMemo(
    () => allQuestions.filter((q) => reviews[q.id]?.status).length,
    [allQuestions, reviews]
  )
  const filteredReviewedCount = useMemo(
    () => filtered.filter((q) => reviews[q.id]?.status).length,
    [filtered, reviews]
  )

  const handleExport = () => {
    const rows = ['id,answer,status']
    for (const aq of allQuestions) {
      const r = reviews[aq.id]
      if (!r?.status) continue
      rows.push(`${aq.id},${r.answer ?? aq.answer},${r.status}`)
    }
    const blob = new Blob(['﻿' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'review_export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Password gate ────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl">
          <h1 className="text-xl font-bold text-slate-800 mb-1">管理者ログイン</h1>
          <p className="text-sm text-gray-400 mb-6">問題監修ツール</p>
          <input
            type="password"
            value={pw}
            onChange={(e) => { setPw(e.target.value); setPwError(false) }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="パスワード"
            className="w-full border border-slate-300 rounded-lg px-4 py-3 text-sm mb-3 outline-none focus:ring-2 focus:ring-blue-400"
          />
          {pwError && <p className="text-red-500 text-xs mb-3">パスワードが違います</p>}
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-bold hover:bg-blue-700 transition-colors"
          >
            ログイン
          </button>
          <div className="mt-4 text-center">
            <Link to="/" className="text-xs text-gray-400 hover:text-gray-600">← ホームに戻る</Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Loading ──────────────────────────────────────────────────
  if (loading || allQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400 animate-pulse">問題を読み込み中...</p>
      </div>
    )
  }

  const q      = filtered[currentIndex]
  const review = q ? reviews[q.id] : undefined
  const effectiveAnswer = review?.answer ?? q?.answer  // 1-based

  // ── Main UI ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 text-white pb-16">

      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="font-bold text-sm">問題監修ツール</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              全体: {totalReviewedCount} / {allQuestions.length} 問確認済み
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleExport}
              disabled={totalReviewedCount === 0}
              className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-40 transition-colors"
            >
              CSVエクスポート
            </button>
            <Link to="/" className="text-xs text-slate-400 hover:text-slate-200">← ホーム</Link>
          </div>
        </div>
      </header>

      {/* Chapter filter tabs */}
      <div className="bg-slate-800 border-b border-slate-700 overflow-x-auto">
        <div className="max-w-2xl mx-auto flex px-4 gap-1 py-2">
          {[{ id: 'all', title: 'すべて' }, ...chapters].map((ch) => (
            <button
              key={ch.id}
              onClick={() => setFilterChapterId(ch.id)}
              className={`shrink-0 text-xs px-3 py-1.5 rounded-lg transition-colors ${
                filterChapterId === ch.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
              }`}
            >
              {ch.id === 'all' ? 'すべて' : ch.title.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">

        {/* Progress bar */}
        <div className="py-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>確認進捗</span>
            <span>{filteredReviewedCount} / {filtered.length} 問</span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: filtered.length > 0 ? `${(filteredReviewedCount / filtered.length) * 100}%` : '0%' }}
            />
          </div>
        </div>

        {q && (
          <>
            {/* Navigation */}
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="text-sm px-4 py-2 bg-slate-700 rounded-lg disabled:opacity-30 hover:bg-slate-600 transition-colors"
              >
                ← 前へ
              </button>
              <span className="text-sm text-slate-400 font-mono">
                {currentIndex + 1} / {filtered.length}
              </span>
              <button
                onClick={() => setCurrentIndex((i) => Math.min(filtered.length - 1, i + 1))}
                disabled={currentIndex === filtered.length - 1}
                className="text-sm px-4 py-2 bg-slate-700 rounded-lg disabled:opacity-30 hover:bg-slate-600 transition-colors"
              >
                次へ →
              </button>
            </div>

            {/* Question header */}
            <div className="bg-slate-800 rounded-2xl p-5 mb-3">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs bg-blue-900 text-blue-300 px-2 py-0.5 rounded-md font-medium">
                  {q.chapterTitle.split(' ')[0]}
                </span>
                <span className="text-xs text-slate-500 font-mono">{q.id}</span>
                {q.difficulty && (
                  <span className="text-xs text-slate-500">{q.difficulty}</span>
                )}
                {review?.status && (
                  <span className={`text-xs px-2 py-0.5 rounded-md font-medium ml-auto ${STATUS_BADGE[review.status]}`}>
                    {review.status}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-slate-100">{q.question}</p>
            </div>

            {/* Choices + answer change */}
            <div className="bg-slate-800 rounded-2xl p-5 mb-3">
              <p className="text-xs text-slate-500 mb-3">選択肢（クリックで正解を変更）</p>
              <div className="space-y-2">
                {q.choices.map((choice, i) => {
                  const isCorrect = effectiveAnswer === i + 1
                  const wasOriginal = q.answer === i + 1
                  const answerChanged = review?.answer !== undefined && review.answer !== q.answer
                  return (
                    <button
                      key={i}
                      onClick={() => setAnswer(q.id, i + 1)}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors flex items-start gap-3 ${
                        isCorrect
                          ? 'bg-green-700 text-white ring-2 ring-green-500'
                          : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                      }`}
                    >
                      <span className={`shrink-0 font-bold text-xs w-5 h-5 flex items-center justify-center rounded-full ${
                        isCorrect ? 'bg-green-400 text-green-900' : 'bg-slate-600 text-slate-300'
                      }`}>
                        {LABELS[i]}
                      </span>
                      <span className="flex-1 leading-snug">{choice}</span>
                      {wasOriginal && !isCorrect && answerChanged && (
                        <span className="shrink-0 text-xs text-slate-500 italic self-center">元の正解</span>
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-slate-600 mt-3">
                現在の正解: <span className="text-green-400 font-bold">
                  {LABELS[(effectiveAnswer ?? 1) - 1]}
                  {review?.answer !== undefined && review.answer !== q.answer && (
                    <span className="text-amber-400 ml-1">（変更済み・元: {LABELS[q.answer - 1]}）</span>
                  )}
                </span>
              </p>
            </div>

            {/* Status */}
            <div className="bg-slate-800 rounded-2xl p-5 mb-3">
              <p className="text-xs text-slate-500 mb-3">ステータス</p>
              <div className="grid grid-cols-3 gap-2">
                {STATUS_LIST.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatus(q.id, s)}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-colors ${
                      review?.status === s ? STATUS_COLOR[s] : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Explanation */}
            {q.explanation && (
              <div className="bg-slate-800 rounded-2xl p-5 mb-3">
                <p className="text-xs text-slate-500 mb-2">解説</p>
                <p className="text-sm text-slate-300 leading-relaxed">{q.explanation}</p>
              </div>
            )}

            {/* Wrong choice reasons */}
            {q.wrong_choice_reasons && Object.keys(q.wrong_choice_reasons).length > 0 && (
              <div className="bg-slate-800 rounded-2xl p-5">
                <p className="text-xs text-slate-500 mb-3">不正解理由</p>
                <div className="space-y-2">
                  {Object.entries(q.wrong_choice_reasons).map(([k, v]) => (
                    <div key={k} className="flex gap-2">
                      <span className="shrink-0 text-xs font-bold text-slate-400 w-4">{LABELS[Number(k) - 1] ?? k}.</span>
                      <p className="text-xs text-slate-400 leading-relaxed">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
