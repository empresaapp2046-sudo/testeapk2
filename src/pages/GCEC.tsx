// @ts-nocheck
import React from 'react';
import { LayoutDashboard, Store, ExternalLink } from 'lucide-react';
import dashboardPreviewAsset from '@/assets/dashboard-preview.png.asset.json';

const GCECPage = () => {
  const handleEnter = () => {
    window.open('https://gerenciador-cec.lovable.app/auth', '_blank');
  };

  const handleVitrine = () => {
    window.open('https://gerenciador-cec.lovable.app/auth', '_blank');
  };

  return (
    <div className="min-h-screen bg-[#0a0f1c] text-white font-sans p-4 md:p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold">
            Gerenciador <span className="text-orange-400">de CEC</span>
          </span>
        </div>
        <button 
          onClick={handleEnter}
          className="bg-[#1e293b] hover:bg-[#334155] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Entrar
        </button>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="max-w-4xl mx-auto mb-20">
          {/* Hero Content */}
          <div className="text-center md:text-left">
            <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
              <LayoutDashboard size={14} />
              VITRINE DE CARNES, ETIQUETAS E CAIXA
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
              Seus Carnes,<br />
              etiquetas de loja<br />
              e Fechamento de<br />
              caixa, <span className="text-orange-400">em exposição</span> e<br />
              prontas para<br />
              imprimir.
            </h1>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed max-w-lg">
              Aumente a produtividade da sua loja com uma solução 3 em 1 completa. Gere carnês profissionais, etiquetas de precificação e controle seu fluxo de caixa em um único lugar. Ganhe agilidade, evite erros manuais e mantenha todos os seus dados seguros na nuvem, acessíveis de qualquer dispositivo.
            </p>
            <button 
              onClick={handleVitrine}
              className="bg-orange-400 hover:bg-orange-500 text-slate-900 font-bold px-8 py-3 rounded-lg transition-all transform hover:scale-105"
            >
              Vitrine
            </button>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mt-12">
              <div className="bg-[#161f32] p-4 rounded-2xl border border-white/5">
                <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">CRIADAS</p>
                <p className="text-2xl font-bold text-orange-400">379</p>
              </div>
              <div className="bg-[#161f32] p-4 rounded-2xl border border-white/5">
                <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">IMPORTADAS</p>
                <p className="text-2xl font-bold text-orange-400">0</p>
              </div>
              <div className="bg-[#161f32] p-4 rounded-2xl border border-white/5">
                <p className="text-slate-500 text-[10px] font-bold uppercase mb-1">TOTAL NO SISTEMA</p>
                <p className="text-2xl font-bold text-orange-400">379</p>
              </div>
            </div>

            <div className="flex gap-6 mt-8 text-[10px] font-bold text-slate-500 uppercase">
              <span className="flex items-center gap-2">💾 Salvar e editar</span>
              <span className="flex items-center gap-2">🔍 Buscar por nome</span>
              <span className="flex items-center gap-2">🖨️ PDF, JPG, PNG e impressão</span>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-20">
          <div className="bg-[#161f32] p-8 rounded-3xl border border-white/5">
            <h3 className="text-2xl font-bold mb-4">Gerador de <span className="text-orange-400">Carnês</span></h3>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Sistema completo para geração de carnês de pagamento. Gere parcelas automáticas ou manuais, controle datas de vencimento, e imprima em formato de cupom térmico ou A4. Tudo salvo na sua conta para consulta rápida.
            </p>
            <ul className="space-y-2 text-orange-400 text-sm font-medium">
              <li className="flex items-center gap-2">✓ Via do Cliente e Via da Loja</li>
              <li className="flex items-center gap-2">✓ Cálculo automático de parcelas</li>
            </ul>
          </div>

          <div className="bg-[#161f32] p-8 rounded-3xl border border-white/5">
            <h3 className="text-2xl font-bold mb-4">Fechamento de <span className="text-orange-400">Caixa</span></h3>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Controle o fluxo financeiro da sua loja com facilidade. Registre vendas em dinheiro, cartões, PIX e a prazo. Lance sangrias e despesas, obtendo o saldo final estimado instantaneamente.
            </p>
            <ul className="space-y-2 text-orange-400 text-sm font-medium">
              <li className="flex items-center gap-2">✓ Histórico de fechamentos</li>
              <li className="flex items-center gap-2">✓ Controle de sangrias e gastos</li>
            </ul>
          </div>
        </div>
        
        {/* Footer Link */}
        <div className="flex justify-center mt-12 mb-8">
          <a 
            href="https://smart-pdv-pro.lovable.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="px-6 py-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-slate-400 text-xs font-bold tracking-widest uppercase flex items-center gap-2 group"
          >
            SISTEMA DE GESTÃO <span className="text-orange-400 group-hover:text-orange-300 transition-colors">SMARTPDV PRO</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default GCECPage;
