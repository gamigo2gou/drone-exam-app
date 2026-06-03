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

/** 日本語テキスト向けバイグラム類似度（0以上の整数、高いほど類似） */
function bigramSimilarity(a, b) {
  if (!a || !b) return 0
  const bigrams = (s) => {
    const set = new Set()
    for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2))
    return set
  }
  const ba = bigrams(a)
  const bb = bigrams(b)
  let shared = 0
  for (const t of ba) if (bb.has(t)) shared++
  return shared
}

/**
 * wrong_choice_reasons のキーを意味的に修復する。
 * シャッフル済みデータで choices の順番とキーがズレている場合、
 * reason テキストと各 wrong choice テキストのバイグラム類似度を使って
 * 正しい position に再割り当てする。
 */
function repairWrongChoiceReasons(q) {
  if (!q.wrong_choice_reasons) return q

  const wrongPositions = [1, 2, 3].filter((p) => p !== q.answer)
  const keys = Object.keys(q.wrong_choice_reasons).map(Number)

  // キーがすべて wrong positions に収まっていれば修復不要
  if (keys.every((k) => wrongPositions.includes(k))) return q

  const reasons = Object.values(q.wrong_choice_reasons)
  const newWcr = {}
  const used = new Set()

  for (const reason of reasons) {
    let bestPos = wrongPositions.find((p) => !used.has(p))  // フォールバック
    let bestScore = -1

    for (const pos of wrongPositions) {
      if (used.has(pos)) continue
      const score = bigramSimilarity(reason, q.choices[pos - 1])
      if (score > bestScore) {
        bestScore = score
        bestPos = pos
      }
    }

    if (bestPos != null) {
      newWcr[String(bestPos)] = reason
      used.add(bestPos)
    }
  }

  return { ...q, wrong_choice_reasons: newWcr }
}

/** 選択肢をシャッフルし、answer と wrong_choice_reasons キーを正しく更新する */
function shuffleChoices(q) {
  // ① まず wrong_choice_reasons を修復
  const fixed = repairWrongChoiceReasons(q)

  const correctChoice = fixed.choices[fixed.answer - 1]

  // ② シャッフル前の「テキスト → 1-based 位置」マップ
  const origPos = new Map()
  fixed.choices.forEach((c, i) => origPos.set(c, i + 1))

  // ③ Fisher-Yates シャッフル
  const choices = [...fixed.choices]
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[choices[i], choices[j]] = [choices[j], choices[i]]
  }

  // ④ 新しい正解位置
  const newAnswer = choices.indexOf(correctChoice) + 1

  // ⑤ 旧位置 → 新位置 マップ
  const posMap = new Map()
  choices.forEach((c, i) => posMap.set(origPos.get(c), i + 1))

  // ⑥ wrong_choice_reasons キーをリマップ
  let newWcr = fixed.wrong_choice_reasons
  if (newWcr) {
    const remapped = {}
    for (const [k, v] of Object.entries(newWcr)) {
      const newKey = posMap.get(Number(k))
      if (newKey != null) remapped[String(newKey)] = v
    }
    newWcr = remapped
  }

  return { ...fixed, choices, answer: newAnswer, wrong_choice_reasons: newWcr }
}

for (const file of FILES) {
  const filePath = join(questionsDir, file)
  const data = JSON.parse(readFileSync(filePath, 'utf8'))

  let repairedCount = 0
  const before = { 1: 0, 2: 0, 3: 0 }
  const after  = { 1: 0, 2: 0, 3: 0 }

  data.questions = data.questions.map((q) => {
    before[q.answer] = (before[q.answer] ?? 0) + 1

    if (q.wrong_choice_reasons) {
      const keys = Object.keys(q.wrong_choice_reasons).map(Number)
      if (keys.includes(q.answer)) repairedCount++
    }

    const shuffled = shuffleChoices(q)
    after[shuffled.answer] = (after[shuffled.answer] ?? 0) + 1
    return shuffled
  })

  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')

  console.log(`\n${file} (${data.questions.length}問)`)
  console.log(`  wrong_choice_reasons 修復: ${repairedCount}問`)
  console.log(`  シャッフル前: A(1)=${before[1]} B(2)=${before[2]} C(3)=${before[3]}`)
  console.log(`  シャッフル後: A(1)=${after[1]}  B(2)=${after[2]}  C(3)=${after[3]}`)
}

console.log('\n完了。chapter1_rules.json は変更していません。')
