// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { VitrineAdminChat } from '../components/VitrineAdminChat';

export const Route = createFileRoute('/vitrine-chat')({
  head: () => ({
    meta: [
      { title: "Chat da Vitrine - Smart PDV PRO" },
      { name: "description", content: "Atendimento ao cliente via chat da vitrine." },
      { property: "og:title", content: "Chat da Vitrine - Smart PDV PRO" },
      { property: "og:description", content: "Atendimento ao cliente via chat da vitrine." },
    ],
  }),
  component: VitrineAdminChat,
});
