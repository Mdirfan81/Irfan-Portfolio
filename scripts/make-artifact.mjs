// Turns the single-file build into a fragment the Artifact host can wrap:
// head contents (minus the local favicon link) followed by body contents.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const src = readFileSync('dist-single/index.html', 'utf8')
const head = src.match(/<head>([\s\S]*?)<\/head>/)[1]
const body = src.match(/<body>([\s\S]*?)<\/body>/)[1]

const cleanedHead = head
  .replace(/<link rel="icon"[^>]*>\s*/g, '')
  .replace(/<meta charset[^>]*>\s*/g, '')
  .replace(/<meta name="viewport"[^>]*>\s*/g, '')
  // The deployed site keeps its SEO title; the hosted preview is named for the
  // gallery, where a short identifying name reads better than a full headline.
  .replace(/<title>[\s\S]*?<\/title>/, '<title>Md Irfan Khan</title>')

mkdirSync('out', { recursive: true })
writeFileSync('out/artifact.html', `${cleanedHead.trim()}\n${body.trim()}\n`)
console.log('wrote out/artifact.html')
