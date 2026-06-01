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

function shuffleChoices(q) {
  const correctChoice = q.choices[q.answer - 1]  // 正解選択肢のテキストを保存

  // Fisher-Yates シャッフル
  const choices = [...q.choices]
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[choices[i], choices[j]] = [choices[j], choices[i]]
  }

  // シャッフル後に正解が何番目になったか特定（1-based）
  const newAnswer = choices.indexOf(correctChoice) + 1

  return { ...q, choices, answer: newAnswer }
}

for (const file of FILES) {
  const filePath = join(questionsDir, file)
  const data = JSON.parse(readFileSync(filePath, 'utf8'))

  const before = { 1: 0, 2: 0, 3: 0 }
  const after  = { 1: 0, 2: 0, 3: 0 }

  data.questions = data.questions.map(q => {
    before[q.answer] = (before[q.answer] ?? 0) + 1
    const shuffled = shuffleChoices(q)
    after[shuffled.answer] = (after[shuffled.answer] ?? 0) + 1
    return shuffled
  })

  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')

  console.log(`\n${file} (${data.questions.length}問)`)
  console.log(`  シャッフル前: A(1)=${before[1]} B(2)=${before[2]} C(3)=${before[3]}`)
  console.log(`  シャッフル後: A(1)=${after[1]}  B(2)=${after[2]}  C(3)=${after[3]}`)
}

console.log('\n完了。chapter1_rules.json は変更していません。')
