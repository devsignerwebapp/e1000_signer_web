// Lists English UI strings that have no translation in src/i18n/<lang>.js.
//   npm run i18n:check            (defaults to az)
//   node scripts/i18n-check.mjs az --json   (print missing keys as JSON)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const lang = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'az'
const asJson = process.argv.includes('--json')
const keys = new Set()
const unq = (s) => s.replace(/\\'/g, "'").replace(/\\"/g, '"')

function scan(src) {
  // t('…'), translate('…'), toast.success/error/info('…')
  for (const m of src.matchAll(/\b(?:t|translate|tRef\.current|toast\.(?:success|error|info))\(\s*(['"])((?:\\.|(?!\1).)*)\1/g)) keys.add(unq(m[2]))
  // { label|title|text|hint: '…' } in constant tables
  for (const m of src.matchAll(/\b(?:label|title|text|hint):\s*'((?:\\.|[^'])*)'/g)) keys.add(unq(m[1]))
  // lookup maps:  key: 'English',   /  'event.type': 'English',
  for (const m of src.matchAll(/^\s*(?:'[\w.]+'|\w+):\s*'((?:\\.|[^'])*)',?\s*$/gm)) keys.add(unq(m[1]))
  // STEPS tuples ['01', 'title', 'text']
  for (const m of src.matchAll(/\[\s*'\d\d',\s*'((?:\\.|[^'])*)',\s*'((?:\\.|[^'])*)'\s*\]/g)) { keys.add(unq(m[1])); keys.add(unq(m[2])) }
}
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) { if (e.name !== 'i18n') walk(p) } else if (/\.(jsx?|mjs)$/.test(e.name)) scan(fs.readFileSync(p, 'utf8'))
  }
}
walk(path.join(root, 'src'))
// usertype & permission descriptions come from the backend RBAC catalog
const rbac = path.join(root, '..', 'e1000_signer_main', 'src', 'config', 'rbac.js')
if (fs.existsSync(rbac)) for (const m of fs.readFileSync(rbac, 'utf8').matchAll(/description: '((?:\\.|[^'])*)'/g)) keys.add(unq(m[1]))

const NOT_TEXT = /^(#|M[\d.]|"|[a-z]+\/|[\w.-]+\.(js|pdf)$|e1k_|https?:|Jane Doe$)/ // colours, icon paths, font stacks, mime types…
const all = [...keys].filter((k) => k && /[A-Za-z]/.test(k) && !NOT_TEXT.test(k)).sort()
const dict = (await import(pathToFileURL(path.join(root, 'src', 'i18n', `${lang}.js`)).href)).default
const missing = all.filter((k) => !(k in dict))
const unused = Object.keys(dict).filter((k) => !keys.has(k))

if (asJson) console.log(JSON.stringify(missing, null, 1))
else {
  console.log(`${all.length} strings found, ${missing.length} missing in ${lang}.js, ${unused.length} possibly unused`)
  for (const k of missing) console.log('  missing:', JSON.stringify(k))
}
