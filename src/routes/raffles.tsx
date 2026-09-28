// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { Raffles } from '../pages/Raffles';

export const Route = createFileRoute('/raffles')({
  head: () => ({
    meta: [
      { title: "Sorteios & Campanhas - Smart PDV PRO" },
      { name: "description", content: "Crie e gerencie sorteios e campanhas promocionais." },
      { property: "og:title", content: "Sorteios & Campanhas - Smart PDV PRO" },
      { property: "og:description", content: "Crie e gerencie sorteios e campanhas promocionais." },
    ],
  }),
  component: Raffles,
});
