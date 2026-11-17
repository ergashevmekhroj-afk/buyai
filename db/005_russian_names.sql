-- 005_russian_names.sql: Russian names so the whole app works in uz / ru / en.
alter table products add column if not exists name_ru text;
alter table regions  add column if not exists name_ru text;

update products p set name_ru = v.ru from (values
  ('rice','Рис'), ('barley','Ячмень'), ('wheat','Пшеница'), ('corn','Кукуруза'), ('compound_feed','Комбикорм'),
  ('flour_high','Мука высшего сорта'), ('flour_first','Мука первого сорта'), ('bread','Хлеб из муки 1 сорта'),
  ('beef','Говядина'), ('mutton','Баранина'), ('poultry','Мясо птицы'), ('fish','Рыба'),
  ('milk','Молоко'), ('eggs','Яйца (10 шт.)'), ('butter','Сливочное масло'),
  ('oil_cottonseed','Хлопковое масло'), ('oil_sunflower','Подсолнечное масло'), ('sugar','Сахар'),
  ('lemons','Лимоны'), ('apples','Яблоки'), ('pears','Груши'), ('grapes','Виноград'), ('watermelon','Арбуз'),
  ('melon','Дыня'), ('kishmish','Изюм (кишмиш)'), ('cabbage','Капуста'), ('cucumbers','Огурцы'),
  ('tomatoes','Помидоры'), ('eggplant','Баклажаны'), ('bell_pepper','Болгарский перец'), ('pumpkin','Тыква'),
  ('carrot','Морковь'), ('garlic','Чеснок'), ('onion','Лук'), ('potatoes','Картофель'),
  ('beans','Фасоль'), ('peas','Нут'), ('mash','Маш')
) as v(id, ru) where p.product_id = v.id;

update regions r set name_ru = v.ru from (values
  ('tashkent_city','город Ташкент'), ('tashkent_region','Ташкентская область'), ('andijan','Андижанская область'),
  ('bukhara','Бухарская область'), ('fergana','Ферганская область'), ('jizzakh','Джизакская область'),
  ('kashkadarya','Кашкадарьинская область'), ('khorezm','Хорезмская область'), ('namangan','Наманганская область'),
  ('navoi','Навоийская область'), ('samarkand','Самаркандская область'), ('sirdarya','Сырдарьинская область'),
  ('surkhandarya','Сурхандарьинская область'), ('karakalpakstan','Республика Каракалпакстан')
) as v(id, ru) where r.region_id = v.id;
