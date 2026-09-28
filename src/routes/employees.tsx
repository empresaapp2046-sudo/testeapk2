// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { EmployeeManagement } from '../pages/EmployeeManagement';

export const Route = createFileRoute('/employees')({
  head: () => ({
    meta: [
      { title: "Gerenciar Funcionários - Smart PDV PRO" },
      { name: "description", content: "Controle de acesso e gestão de equipe." },
      { property: "og:title", content: "Gerenciar Funcionários - Smart PDV PRO" },
      { property: "og:description", content: "Controle de acesso e gestão de equipe." },
    ],
  }),
  component: EmployeeManagement,
});
