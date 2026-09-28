// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { POS } from '../pages/POS';

export const Route = createFileRoute('/pos')({
  head: () => ({
    meta: [
      { title: "PDV - Smart PDV PRO" },
      { name: "description", content: "Ponto de Venda rápido e eficiente." },
    ],
  }),
  component: POS,
});

