begin;

-- Apply only after both deployments use the public view and guarded editor RPC.
revoke select on public.articles from public, anon, authenticated;
grant select (id,slug,title,excerpt,content,category_id,cover_image_url,author,published_at,
  is_published,seo_title,seo_description,affiliate_links,image_source,sources,content_format,
  is_legacy,public_updated_at,public_revision) on public.articles to anon, authenticated;

notify pgrst, 'reload schema';
commit;
