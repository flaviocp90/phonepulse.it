import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const workflow = file => readFileSync(new URL(`../.github/workflows/${file}`, import.meta.url), 'utf8')

test('scheduled generation saves drafts using only the free provider', () => {
  const yaml = workflow('job-a-scraping.yml')
  assert.match(yaml, /schedule:\s*\n\s*- cron: '23 2 \* \* \*'/)
  assert.match(yaml, /if: github\.ref == 'refs\/heads\/master' && vars\.PHONEPULSE_RESEARCH_ENABLED == 'true'/)
  assert.match(yaml, /python scripts\/news_automation\.py/)
  for (const key of ['OPENROUTER_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY']) assert.ok(yaml.includes(`secrets.${key}`))
  assert.doesNotMatch(yaml, /GEMINI|GOOGLE_CSE|TELEGRAM|publish_article\.py|contents: write/)
})

test('publisher defaults to a dry-run and uses the approved queue in both modes', () => {
  const yaml = workflow('job-b-publish.yml')
  const [preview, publish] = yaml.split('\n  publish:')
  assert.match(preview, /schedule:\s*\n\s*- cron: '17 8 \* \* \*'/)
  assert.match(preview, /type: boolean\s*\n\s*default: true/)
  assert.match(preview, /github\.ref == 'refs\/heads\/master'.*PHONEPULSE_PUBLICATION_MODE == 'dry-run'/)
  assert.match(preview, /run: python scripts\/publish_article\.py --dry-run\s*$/)
  assert.doesNotMatch(preview, /contents: write/)
  assert.match(publish, /github\.ref == 'refs\/heads\/master'/)
  assert.match(publish, /github\.event_name == 'schedule' && \(vars\.PHONEPULSE_PUBLICATION_MODE == '' \|\| vars\.PHONEPULSE_PUBLICATION_MODE == 'live'\)/)
  assert.match(publish, /github\.event_name == 'workflow_dispatch' && vars\.PHONEPULSE_PUBLICATION_MODE == 'live' && !inputs\.dry_run/)
  assert.match(publish, /PUBLISH_COUNT: '1'/)
  assert.match(publish, /run: python scripts\/publish_article\.py\s*$/)
  assert.doesNotMatch(yaml, /TELEGRAM|post-to-social|--require-evidence/)
})
