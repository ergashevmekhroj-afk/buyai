-- 010: generic "meat" words ("go'sht", "гўшт", "meat", "мяс") were beef keywords, so "go'sht kerak" meant only beef.
-- Now they belong to the MEAT GROUP in the app (web/src/lib/agents/planner.js: CATEGORIES.meat = beef, mutton, poultry).
update products set keywords = 'mol go''shti, mol goshti, мол гўшти, beef, говядин' where product_id = 'beef';
