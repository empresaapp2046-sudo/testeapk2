// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { VitrineSettings } from '../pages/VitrineSettings';

export const Route = createFileRoute('/vitrine-settings')({
  head: () => ({
    meta: [
      { title: "Configurações da Vitrine - Smart PDV PRO" },
      { name: "description", content: "Personalize sua vitrine online." },
      { property: "og:title", content: "Configurações da Vitrine - Smart PDV PRO" },
    ],
  }),
  component: VitrineSettings,
});
