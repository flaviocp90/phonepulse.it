import { validateRequest } from './validation.ts'
function assert(value: unknown) { if (!value) throw new Error('Assertion failed') }
Deno.test('only UUID and distinct supported platforms, including no selection', () => {
  for (const body of [null, [], {}, { article_id: 'bad', platforms: ['x'] },
    { article_id: '10000000-0000-4000-8000-000000000001', platforms: ['telegram', 'telegram'] },
    { article_id: '10000000-0000-4000-8000-000000000001', platforms: ['telegram'], title: 'client text' }]) {
    assert(validateRequest(body).length > 0)
  }
  assert(validateRequest({ article_id: '10000000-0000-4000-8000-000000000001', platforms: [] }).length === 0)
})
