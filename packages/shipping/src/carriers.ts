import type { Carrier } from './types.js';

export interface CarrierMeta {
  display_name: string;
  rate_card_url: string;
  notes: string;
}

export const CARRIERS: Record<Carrier, CarrierMeta> = {
  CTT: {
    display_name: 'CTT (Correios de Portugal)',
    rate_card_url: 'https://www.ctt.pt/empresas/preco-correto',
    notes:
      'Internacional Económico (lento, 5–10 dias) e Internacional Prioritário (3–6 dias). Tarifas oficiais publicadas anualmente em PDF.',
  },
  Chronopost: {
    display_name: 'Chronopost Portugal',
    rate_card_url: 'https://www.chronopost.pt/pt/tarifario',
    notes:
      'International Premium 2–3 dias, mais caro mas com tracking robusto. Pertence à La Poste / DPDgroup.',
  },
  DHL: {
    display_name: 'DHL Express',
    rate_card_url: 'https://mydhl.express.dhl/pt/pt/help-and-support/shipping-rates.html',
    notes:
      'Express Worldwide, 1–3 dias, prémio. Tarifário muda 1×/ano (Jan) + sobretaxas combustível mensais.',
  },
  UPS: {
    display_name: 'UPS',
    rate_card_url: 'https://www.ups.com/pt/pt/business-solutions/getting-started/rates.page',
    notes: 'Standard 4–6 dias EU, Express Saver 2–3 dias. Sobretaxa combustível semanal.',
  },
  InPost: {
    display_name: 'InPost Portugal (Lockers Paczkomaty)',
    rate_card_url: 'https://inpost.pt/precos',
    notes:
      'Locker-to-locker internacional (PT→ES/FR/IT/DE/NL/BE/PL/UK). Mais barato em rotas onde existe rede InPost no destino. Cliente final tem de levantar em locker — não há entrega ao domicílio neste serviço cross-border.',
  },
  DPD: {
    display_name: 'DPD Portugal',
    rate_card_url: 'https://www.dpd.com/pt/pt/empresas/precario',
    notes: 'Classic EU 2–5 dias. Boa relação preço/prazo para volumes médios.',
  },
  GLS: {
    display_name: 'GLS Portugal',
    rate_card_url: 'https://gls-group.com/PT/pt/empresas/tarifas',
    notes: 'EuroBusinessParcel 2–5 dias EU. Forte na Europa Central (DE/AT/CZ/PL).',
  },
};
