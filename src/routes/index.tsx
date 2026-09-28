import { createFileRoute } from '@tanstack/react-router';
import { LandingPage } from '../pages/LandingPage';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: "Smart PDV PRO - Gestão Inteligente & Segura" },
      { name: "description", content: "O PDV mais completo do mercado. Venda mais com gestão inteligente, estoque, financeiro e sua própria vitrine online." },
      { property: "og:title", content: "Smart PDV PRO - Gestão Inteligente" },
      { property: "og:description", content: "Tudo o que você precisa para gerenciar sua loja em um só lugar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});
