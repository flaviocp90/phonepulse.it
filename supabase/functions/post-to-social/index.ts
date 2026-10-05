import { handleRequest } from './handler.ts'
const env = (name: string) => Deno.env.get(name) || ''
Deno.serve(req => handleRequest(req, {
  supabaseUrl: env('SUPABASE_URL'), anonKey: env('SUPABASE_ANON_KEY'), serviceKey: env('SUPABASE_SERVICE_ROLE_KEY'),
  telegramToken: env('TELEGRAM_BOT_TOKEN'), telegramChat: env('TELEGRAM_CHAT_ID'),
  publicReady: env('SOCIAL_PUBLIC_HTML_READY') === 'true',
  instagramToken: env('INSTAGRAM_ACCESS_TOKEN'), instagramAccount: env('INSTAGRAM_ACCOUNT_ID'),
  instagramVersion: env('INSTAGRAM_GRAPH_VERSION'), instagramReady: env('INSTAGRAM_READY') === 'true',
}))
