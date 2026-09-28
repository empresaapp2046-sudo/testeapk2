// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { Reports } from '../pages/Reports';

export const Route = createFileRoute('/reports')({
  head: () => ({
    meta: [
      { title: "Relatórios & IA - Smart PDV PRO" },
      { name: "description", content: "Análise financeira e insights baseados em IA para o seu negócio." },
      { property: "og:title", content: "Relatórios & IA - Smart PDV PRO" },
      { property: "og:description", content: "Análise financeira e insights baseados em IA para o seu negócio." },
    ],
  }),
  component: Reports,
});
