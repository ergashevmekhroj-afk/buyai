-- 007_offer_stats_view.sql: one-row summary for the dashboard numbers
-- (so the app does not download thousands of offers just to count them).
-- security_invoker: the view uses the reader's permissions, so the normal public-read RLS rules apply.
create or replace view offer_stats with (security_invoker = true) as
select count(*)::int                                   as offers,
       count(*) filter (where is_demo)::int            as demo_offers,
       count(*) filter (where not is_demo)::int        as live_offers,
       count(distinct seller_id)::int                  as sellers
from active_offers;
grant select on offer_stats to anon, authenticated;
