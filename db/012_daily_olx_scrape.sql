-- 012: refresh OLX prices automatically every day at 01:00 UTC (06:00 Tashkent).
-- The scrape-olx function refuses runs closer than 6 hours apart, so extra calls are harmless.
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule('scrape-olx-daily', '0 1 * * *', $$
  select net.http_post(
    url := 'https://gvffeagwuoaqbzmarqqf.supabase.co/functions/v1/scrape-olx',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_Rd-twraa5DhZW4vIK0iNWw_YF_H0hIK", "Authorization": "Bearer sb_publishable_Rd-twraa5DhZW4vIK0iNWw_YF_H0hIK"}'::jsonb,
    timeout_milliseconds := 180000)
$$);
