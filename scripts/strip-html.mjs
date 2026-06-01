import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const questionsDir = join(__dirname, '..', 'public', 'questions')

const FILES = [
  'chapter1_rules.json',
  'chapter2_system.json',
  'chapter3_pilot.json',
  'chapter4_risk.json',
]

/** HTMLタグと主要エンティティを除去し、余分な空白を正規化 */
function stripHtml(text) {
  if (typeof text !== 'string') return text
  return text
    .replace(/<[^>]*>/g, '')      // <tag> / </tag> / <tag/> 除去
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&hellip;/gi, '…')
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/<[^>]*>/g, '')  // JSON unicode escaped形式
    .replace(/\s{2,}/g, ' ')      // 連続スペースを1つに
    .trim()
}

function stripObj(obj) {
  if (typeof obj === 'string') return stripHtml(obj)
  if (Array.isArray(obj)) return obj.map(stripObj)
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, stripObj(v)]))
  }
  return obj
}

let totalCleaned = 0

for (const file of FILES) {
  const filePath = join(questionsDir, file)
  const raw = readFileSync(filePath, 'utf8')
  const data = JSON.parse(raw)
  let fileCleaned = 0

  for (const q of data.questions) {
    // 対象フィールドを個別に処理してカウント
    for (const field of ['question', 'explanation']) {
      if (typeof q[field] === 'string') {
        const cleaned = stripHtml(q[field])
        if (cleaned !== q[field]) { q[field] = cleaned; fileCleaned++ }
      }
    }
    if (Array.isArray(q.choices)) {
      q.choices = q.choices.map(c => {
        const cleaned = stripHtml(c)
        if (cleaned !== c) fileCleaned++
        return cleaned
      })
    }
    if (q.wrong_choice_reasons && typeof q.wrong_choice_reasons === 'object') {
      for (const [k, v] of Object.entries(q.wrong_choice_reasons)) {
        const cleaned = stripHtml(v)
        if (cleaned !== v) { q.wrong_choice_reasons[k] = cleaned; fileCleaned++ }
      }
    }
  }

  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
  console.log(`${file}: ${fileCleaned > 0 ? fileCleaned + ' 箇所修正' : 'HTMLなし（変更なし）'}`)
  totalCleaned += fileCleaned
}

console.log(totalCleaned > 0
  ? `\n合計 ${totalCleaned} 箇所のHTMLタグを除去しました。`
  : '\nすべてのファイルにHTMLタグはありませんでした。'
)
