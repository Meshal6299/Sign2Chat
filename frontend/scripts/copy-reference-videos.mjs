// Copies the UAE100 reference sign videos into public/ so the dev server and
// production build can serve them, and writes a manifest the UI loads.
//
// Source videos live OUTSIDE the frontend (../UAE100), one .mp4 per word named
// exactly after the class_map `word` field, grouped in category subfolders.
// Rather than hardcode the word→category mapping we just index every .mp4 under
// UAE100 by basename and match each class entry to its file.
//
// Runs automatically via the predev/prebuild npm hooks. Output is gitignored.

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, dirname, basename, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname   = dirname(fileURLToPath(import.meta.url))
const FRONTEND    = resolve(__dirname, '..')
const UAE100_DIR  = resolve(FRONTEND, '..', 'UAE100')
const CLASS_MAP   = join(FRONTEND, 'public', 'class_map.json')
const OUT_DIR     = join(FRONTEND, 'public', 'reference')
const OUT_INDEX   = join(FRONTEND, 'public', 'reference_index.json')

if (!existsSync(UAE100_DIR)) {
  console.warn(`[reference-videos] UAE100 folder not found at ${UAE100_DIR} — skipping.`)
  process.exit(0)
}

// Recursively index every .mp4 under UAE100 by its basename, keeping the
// containing folder name as the human-readable category.
function indexVideos(dir) {
  const map = {}
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      Object.assign(map, indexVideos(full))
    } else if (name.toLowerCase().endsWith('.mp4')) {
      map[basename(name, '.mp4')] = { path: full, category: basename(dirname(full)) }
    }
  }
  return map
}

const videoIndex = indexVideos(UAE100_DIR)
const classMap   = JSON.parse(readFileSync(CLASS_MAP, 'utf8'))

mkdirSync(OUT_DIR, { recursive: true })

const manifest = []
const missing  = []

const videoKeys = Object.keys(videoIndex)

for (const entry of Object.values(classMap)) {
  const { word, clean_name } = entry
  // Exact basename match, else a file with a trailing variant suffix
  // (e.g. class word "Colors_02_Black" → file "Colors_02_Black_01.mp4").
  const key = videoIndex[word] ? word : videoKeys.find(k => k.startsWith(`${word}_`))
  const found = key ? videoIndex[key] : null
  if (!found) { missing.push(word); continue }

  copyFileSync(found.path, join(OUT_DIR, `${word}.mp4`))
  manifest.push({
    word,
    label: clean_name.replace(/_/g, ' '),
    category: found.category,
    video: `/reference/${word}.mp4`,
  })
}

// Sort by category, then label, for a stable grouped display.
manifest.sort((a, b) =>
  a.category.localeCompare(b.category) || a.label.localeCompare(b.label))

writeFileSync(OUT_INDEX, JSON.stringify(manifest, null, 2))

console.log(`[reference-videos] copied ${manifest.length} videos → public/reference/`)
if (missing.length) {
  console.warn(`[reference-videos] no video found for ${missing.length} word(s): ${missing.join(', ')}`)
}
