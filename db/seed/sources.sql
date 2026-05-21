-- Seed the marketplace sources. Vinted is included but only runs on a self-hosted
-- runner (residential IP) — Datadome blocks GitHub-hosted runners.
-- Wallapop, Leboncoin, Subito remain deferred (also Datadome, paid proxies required).

INSERT INTO sources (name, type, country, base_url, rate_per_hour) VALUES
  ('ebay',         'api',    NULL, 'https://api.ebay.com/buy/browse/v1',          5000),
  ('aliexpress',   'api',    NULL, 'https://api-sg.aliexpress.com',                1000),
  ('amazon',       'api',    'ES', 'https://webservices.amazon.es',                3600),
  ('mercadolivre', 'api',    NULL, 'https://api.mercadolibre.com',                 1000),
  ('olx-pt',       'scrape', 'PT', 'https://www.olx.pt',                            60),
  ('depop',        'scrape', 'UK', 'https://webapi.depop.com',                      60),
  ('grailed',      'scrape', 'US', 'https://www.grailed.com',                       20),
  ('custojusto',   'scrape', 'PT', 'https://www.custojusto.pt',                     15),
  ('catawiki',     'scrape', 'NL', 'https://www.catawiki.com',                      10),
  ('vinted',       'scrape', 'PT', 'https://www.vinted.pt',                         30)
ON CONFLICT (name) DO UPDATE SET
  type          = EXCLUDED.type,
  country       = EXCLUDED.country,
  base_url      = EXCLUDED.base_url,
  rate_per_hour = EXCLUDED.rate_per_hour;
