import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'

const assets = readdirSync(new URL('../dist/assets/', import.meta.url))
assert(!assets.some(name => /Admin|VisualEditor|editorial/i.test(name)), 'Admin chunk in public build')
for (const name of assets.filter(name => name.endsWith('.js'))) {
  const source = readFileSync(new URL('../dist/assets/' + name, import.meta.url), 'utf8')
  assert(!/editor_articles|save_article|approve_article|set_article_status|submit_luna_review/.test(source), 'Editorial operation in public build: ' + name)
}
console.log('Public build contains no editorial modules or operations')
