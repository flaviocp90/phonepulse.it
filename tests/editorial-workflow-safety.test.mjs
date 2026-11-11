import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const workflow = file => readFileSync(new URL(`../.github/workflows/${file}`, import.meta.url), 'utf8')

test('scheduled research uses the review-only export without production secrets', () => {
  const yaml = workflow('job-a-scraping.yml')
  assert.match(yaml, /schedule:\s*\n\s*- cron: '17 2 \* \* \*'/)
  assert.match(yaml, /if: github\.ref == 'refs\/heads\/master' && vars\.PHONEPULSE_RESEARCH_ENABLED == 'true'/)
  assert.match(yaml, /python scripts\/editorial_dry_run\.py .* --fetch/)
  assert.match(yaml, /python scripts\/editorial_export\.py --research-only/)
  assert.doesNotMatch(yaml, /secrets\.|news_automation\.py|publish_article\.py|contents: write/)
})

test('publisher defaults to a dry-run and uses the evidence gate in both modes', () => {
  const yaml = workflow('job-b-publish.yml')
  const [preview, publish] = yaml.split('\n  publish:')
  assert.match(preview, /schedule:\s*\n\s*- cron: '17 8 \* \* \*'/)
  assert.match(preview, /type: boolean\s*\n\s*default: true/)
  assert.match(preview, /github\.ref == 'refs\/heads\/master'.*PHONEPULSE_PUBLISH_MODE == 'dry-run'/)
  assert.match(preview, /run: python scripts\/publish_article\.py --require-evidence --dry-run\s*$/)
  assert.doesNotMatch(preview, /contents: write/)
  assert.match(publish, /github\.ref == 'refs\/heads\/master' && vars\.PHONEPULSE_PUBLISH_MODE == 'live'/)
  assert.match(publish, /github\.event_name == 'workflow_dispatch' && !inputs\.dry_run/)
  assert.match(publish, /PUBLISH_COUNT: '1'/)
  assert.match(publish, /run: python scripts\/publish_article\.py --require-evidence\s*$/)
  assert.doesNotMatch(yaml, /TELEGRAM|post-to-social/)
})
