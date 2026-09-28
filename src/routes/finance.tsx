// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { Finance } from '../pages/Finance';

export const Route = createFileRoute('/finance')({
  head: () => ({
    meta: [
      { title: "Financeiro - Smart PDV PRO" },
      { name: "description", content: "Controle financeiro e fluxo de caixa." },
    ],
  }),
  component: Finance,
});

