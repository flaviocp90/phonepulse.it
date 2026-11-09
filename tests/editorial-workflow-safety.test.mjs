import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

for (const file of ['.github/workflows/job-a-scraping.yml', '.github/workflows/job-b-publish.yml']) {
  test(`${file}: no automatic schedule or unattended execution`, () => {
    const yaml = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    assert.match(yaml, /^on:\s*$/m)
    assert.match(yaml, /^  workflow_dispatch:\s*$/m)
    assert.doesNotMatch(yaml, /^\s*schedule\s*:/m)
    assert.doesNotMatch(yaml, /^\s*-\s*cron\s*:/m)
    assert.match(yaml, /^\s*run:\s*python scripts\/(news_automation|publish_article)\.py/m)
  })
}
