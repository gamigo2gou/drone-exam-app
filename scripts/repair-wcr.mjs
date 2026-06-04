/**
 * wrong_choice_reasons キー修復スクリプト（シャッフルなし）
 *
 * 選択肢の並び順は変えず、wrong_choice_reasons のキー（選択肢番号）だけを
 * 意味的照合で正しい位置に割り当て直す。
 *
 * 改善点（初回修復からの変更）:
 *  - 修復対象を全問に拡大（正解キー混入問題に限定しない）
 *  - 加重 N-gram Jaccard 類似度（2・3・4-gram）で精度向上
 *  - 2 理由×2 wrong 位置のケースは全順列を比較して最適割り当て
 */

import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const questionsDir = join(__dirname, '..', 'public', 'questions')

const FILES = [
  'chapter2_system.json',
  'chapter3_pilot.json',
  'chapter4_risk.json',
]

/** N-gram Jaccard 類似度（0〜1） */
function ngramJaccard(a, b, n) {
  if (!a || !b || a.length < n || b.length < n) return 0
  const sa = new Set()
  const sb = new Set()
  for (let i = 0; i <= a.length - n; i++) sa.add(a.slice(i, i + n))
  for (let i = 0; i <= b.length - n; i++) sb.add(b.slice(i, i + n))
  let shared = 0
  for (const t of sa) if (sb.has(t)) shared++
  const union = sa.size + sb.size - shared
  return union > 0 ? shared / union : 0
}

/**
 * 加重 N-gram 類似度
 * 長い N-gram ほど高いウェイト（より識別力が高い）
 */
function similarity(a, b) {
  if (!a || !b) return 0
  return (
    1.0 * ngramJaccard(a, b, 2) +
    2.0 * ngramJaccard(a, b, 3) +
    3.0 * ngramJaccard(a, b, 4)
  )
}

/**
 * 全問を対象に wrong_choice_reasons を意味的最適割り当てで修復する。
 * 選択肢の並び順（choices・answer）は変更しない。
 */
function repairQuestion(q) {
  if (!q.wrong_choice_reasons) return q

  const wrongPositions = [1, 2, 3].filter((p) => p !== q.answer)
  const reasons = Object.values(q.wrong_choice_reasons)
  if (reasons.length === 0) return q

  const newWcr = {}

  if (reasons.length === 2 && wrongPositions.length === 2) {
    // 全順列を評価して最適割り当てを選択
    const [r0, r1] = reasons
    const [p0, p1] = wrongPositions
    const scoreA = similarity(r0, q.choices[p0 - 1]) + similarity(r1, q.choices[p1 - 1])
    const scoreB = similarity(r0, q.choices[p1 - 1]) + similarity(r1, q.choices[p0 - 1])
    if (scoreA >= scoreB) {
      newWcr[String(p0)] = r0
      newWcr[String(p1)] = r1
    } else {
      newWcr[String(p1)] = r0
      newWcr[String(p0)] = r1
    }
  } else {
    // 1 理由：最も類似度が高い wrong 位置へ割り当て
    const used = new Set()
    for (const reason of reasons) {
      let bestPos = wrongPositions.find((p) => !used.has(p))
      let bestScore = -1
      for (const pos of wrongPositions) {
        if (used.has(pos)) continue
        const score = similarity(reason, q.choices[pos - 1])
        if (score > bestScore) { bestScore = score; bestPos = pos }
      }
      if (bestPos != null) { newWcr[String(bestPos)] = reason; used.add(bestPos) }
    }
  }

  return { ...q, wrong_choice_reasons: newWcr }
}

let grandTotal = 0

for (const file of FILES) {
  const filePath = join(questionsDir, file)
  const data = JSON.parse(readFileSync(filePath, 'utf8'))

  let changed = 0
  let answerKeyBug = 0

  data.questions = data.questions.map((q) => {
    if (!q.wrong_choice_reasons) return q

    // 正解キー混入チェック（参考値）
    const keys = Object.keys(q.wrong_choice_reasons).map(Number)
    if (keys.includes(q.answer)) answerKeyBug++

    const repaired = repairQuestion(q)

    // 変更があったかを判定
    const before = JSON.stringify(q.wrong_choice_reasons)
    const after  = JSON.stringify(repaired.wrong_choice_reasons)
    if (before !== after) changed++

    return repaired
  })

  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')

  console.log(`\n${file} (${data.questions.length}問)`)
  console.log(`  正解キー混入（修復前）: ${answerKeyBug}問`)
  console.log(`  キー変更あり（今回）  : ${changed}問`)
  grandTotal += changed
}

console.log(`\n合計 ${grandTotal} 問の wrong_choice_reasons キーを更新しました。`)
console.log('選択肢の並び順・answer は変更していません。')
