// @ts-nocheck
import React from 'react';
import { useStore, defaultPlans } from '../context/StoreContext';
import { Lock, Check, Crown, Zap, Shield, Sparkles } from 'lucide-react';

export const PlanGate = ({ children }) => {
  const { isFreeVersion, settings, currentUser, isAdmin } = useStore();

  if (isAdmin || !isFreeVersion) {
    return children;
  }

  const plans = (settings.customPlans && settings.customPlans.length > 0) ? settings.customPlans : defaultPlans;

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-4xl w-full overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white text-center">
          <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
            <Lock size={32} />
          </div>
          <h2 className="text-3xl font-bold mb-2">Funcionalidade Exclusiva</h2>
          <p className="text-blue-100 opacity-90">
            Esta tela faz parte do módulo avançado do SmartPDV Pró. Para continuar, selecione um plano que melhor atenda ao seu negócio.
          </p>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => (
              <div 
                key={plan.key}
                className={`flex flex-col rounded-2xl border-2 p-6 transition-all hover:scale-[1.02] ${
                  plan.key === 'fidelity' ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100'
                }`}
              >
                <div className="mb-4">
                  {plan.key === 'fidelity' && (
                    <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
                      Recomendado
                    </span>
                  )}
                  <h3 className="font-bold text-slate-800">{plan.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-slate-900">{plan.price}</span>
                    {plan.key !== 'lifetime' && <span className="text-xs text-slate-500">/{plan.key === 'annual_eco' ? 'ano' : 'mês'}</span>}
                    {plan.key === 'lifetime' && <span className="text-xs text-slate-500">único</span>}
                  </div>
                </div>

                <div className="flex-1 space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                      <div className="mt-0.5 text-emerald-500"><Check size={14} /></div>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => window.open('https://wa.me/' + (settings.phone?.replace(/\D/g, '') || ''), '_blank')}
                  className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all ${
                    plan.key === 'fidelity' 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200' 
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  Assinar Agora
                </button>
              </div>
            ))}
          </div>

          <div className="mt-12 bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row items-center gap-6">
            <div className="flex-1 text-center md:text-left">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 justify-center md:justify-start">
                <Sparkles className="text-amber-500" size={20} /> Por que assinar o Pro?
              </h4>
              <p className="text-sm text-slate-600 mt-2">
                Libere relatórios inteligentes com IA, gestão de estoque avançada, controle financeiro completo e suporte prioritário 24/7.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="bg-blue-100 p-3 rounded-xl text-blue-600 mb-2"><Shield size={24} /></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Seguro</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-purple-100 p-3 rounded-xl text-purple-600 mb-2"><Zap size={24} /></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Rápido</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="bg-emerald-100 p-3 rounded-xl text-emerald-600 mb-2"><Crown size={24} /></div>
                <span className="text-[10px] font-bold text-slate-500 uppercase">Premium</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};