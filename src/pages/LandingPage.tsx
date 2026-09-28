import React, { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { useStore, defaultPlans } from '../context/StoreContext';
import { 
  ShoppingBag, 
  ShieldCheck, 
  LayoutDashboard, 
  Zap, 
  BarChart3, 
  Globe, 
  ChevronRight, 
  Star,
  Users,
  CreditCard,
  Rocket,
  FileText,
  Calendar,
  BadgePercent,
  Wallet,
  MessageSquare,
  UserCog,
  Briefcase,
  TrendingUp,
  History,
  CheckCircle2
} from 'lucide-react';

// Imagens servidas localmente (public/previews) para funcionar tambem fora do Lovable
const dashboardPreviewAsset = { url: '/previews/dashboard-preview.png' };
const posPreviewAsset = { url: '/previews/pos-preview.png' };
const financePreviewAsset = { url: '/previews/finance-preview.png' };
const rafflePreviewAsset = { url: '/previews/raffle-preview.png' };
const couponsPreviewAsset = { url: '/previews/coupons-preview.png' };
const financialReportsPreviewAsset = { url: '/previews/financial-reports-preview.png' };
const smartpdvLogoAsset = { url: '/previews/smartpdv-logo.png' };

export const LandingPage = () => {
  const { users, settings: contextSettings, platformPlans } = useStore();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const heroImages = [
    { url: dashboardPreviewAsset.url, label: "Dashboard Inteligente", path: "smartpdv.pro/dashboard" },
    { url: posPreviewAsset.url, label: "PDV Ágil e Intuitivo", path: "smartpdv.pro/pos" },
    { url: financePreviewAsset.url, label: "Gestão Financeira Completa", path: "smartpdv.pro/financeiro" },
    { url: rafflePreviewAsset.url, label: "Central de Sorteios", path: "smartpdv.pro/sorteios" },
    { url: couponsPreviewAsset.url, label: "Campanhas Promocionais", path: "smartpdv.pro/campanhas" },
    { url: financialReportsPreviewAsset.url, label: "Relatórios Financeiros Avançados", path: "smartpdv.pro/relatorios-ia" }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [heroImages.length]);
  
  // Encontrar o administrador principal para pegar os dados da landing page
  // Como as configurações estão no StoreContext via Firebase, vamos buscar o usuário admin
  const adminUser = users.find(u => u.role === 'AdminGeral') || users.find(u => u.username === 'coutinho');

  const defaultLogoUrl = smartpdvLogoAsset.url;

  const logoUrl = contextSettings?.logo || defaultLogoUrl;


  const whatsappNumber = "5541988192359";
  const whatsappMsg = encodeURIComponent("Olá, gostaria de gerar um link de cadastro para começar a usar o sistema Smart PDV PRO.");
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMsg}`;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 overflow-hidden">

            <img 
              src={logoUrl} 
              alt="Logo" 
              className="w-full h-full object-contain p-1"
              onError={(e) => {
                e.currentTarget.src = defaultLogoUrl;
              }}
            />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-800">{contextSettings?.name || "Smart PDV PRO"}</span>
        </div>
        <div className="flex items-center gap-8">
          <a href="#funcionalidades" className="hidden lg:flex text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Funcionalidades</a>
          <a href="#planos" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Planos</a>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors">Entrar</Link>
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex px-4 py-2 text-sm font-semibold border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Criar conta
          </a>
          <a 
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex px-5 py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100 items-center justify-center text-center leading-tight min-h-[44px]"
          >
            Começar Agora
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative pt-20 pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-bold uppercase tracking-wider mb-6">
              <Zap size={14} /> O PDV mais completo do mercado
            </div>
            <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] mb-6">
              Venda mais com <span className="text-blue-600">Gestão Inteligente</span>
            </h1>
            <p className="text-lg text-slate-600 mb-10 max-w-xl leading-relaxed">
              Tudo o que você precisa para gerenciar sua loja, estoque, financeiro e vendas em um só lugar. Sistema 100% local, rápido e seguro, com seus dados sempre no seu computador.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a 
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-200 group"
              >
                Criar Smart PDV PRO <ChevronRight className="group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
            <div className="mt-12 flex items-center gap-4 text-sm text-slate-500">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 overflow-hidden">
                    <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="User" />
                  </div>
                ))}
              </div>
              <span>+500 lojistas confiam no Smart PDV PRO</span>
            </div>
          </div>
          <div className="relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-600/5 rounded-full blur-3xl"></div>
            <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden transform lg:rotate-2 hover:rotate-0 transition-all duration-700 w-full max-w-4xl mx-auto">
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="bg-white border border-slate-200 rounded px-2 py-0.5 text-[10px] text-slate-400 w-full max-w-xs mx-auto text-center truncate">
                  {heroImages[currentImageIndex]?.path}
                </div>
              </div>
              
              <div className="relative overflow-hidden w-full h-auto">
                {heroImages.map((image, index) => (
                  <img 
                    key={index}
                    src={image.url} 
                    alt={image.label} 
                    className={`w-full h-auto object-contain transition-all duration-1000 ${
                      index === currentImageIndex ? 'relative opacity-100 scale-100 z-10' : 'absolute inset-0 opacity-0 scale-110 z-0'
                    }`}
                  />
                ))}
              </div>
            </div>
            
            {/* Image Indicators */}
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-20">
              {heroImages.map((_, index) => (
                <div 
                  key={index}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentImageIndex ? 'w-6 bg-blue-600' : 'bg-slate-300'
                  }`}
                />
              ))}
            </div>
            
            {/* Floating stats cards - Hidden on mobile */}
            <div className="hidden md:block absolute -bottom-6 -left-6 bg-white p-4 rounded-xl shadow-xl border border-slate-100 animate-bounce-slow">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Vendas de Hoje</div>
                  <div className="text-lg font-bold text-slate-800">R$ 40.269,38</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section id="funcionalidades" className="py-24 bg-white px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-blue-600 font-bold tracking-widest uppercase text-sm mb-4">Poderoso & Intuitivo</h2>
            <h3 className="text-3xl lg:text-5xl font-extrabold text-slate-900 mb-6">Tudo para sua gestão</h3>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              Desenvolvemos cada recurso pensando na agilidade e controle total que o seu negócio merece.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<LayoutDashboard className="text-blue-600" />}
              title="Dashboard Completo"
              description="Visão geral das suas vendas, estoque e financeiro em tempo real com gráficos intuitivos."
            />
            <FeatureCard 
              icon={<Globe className="text-purple-600" />}
              title="Vitrine Online"
              description="Sua loja na web em segundos. Compartilhe o link com seus clientes e receba pedidos no WhatsApp."
              badge="Exclusivo Plano Mensal Fidelidade"
            />
            <FeatureCard 
              icon={<Zap className="text-orange-600" />}
              title="PDV Ágil"
              description="Venda em segundos com nossa interface otimizada para desktop e dispositivos móveis."
            />
            <FeatureCard 
              icon={<FileText className="text-red-600" />}
              title="Geração de Carnês"
              description="Emita carnês de pagamento personalizados para seus clientes com facilidade e controle."
            />
            <FeatureCard 
              icon={<CreditCard className="text-indigo-600" />}
              title="Vendas a Prazo"
              description="Gerencie vendas parceladas, controle de fiado e limites de crédito por cliente ou empresa."
            />
            <FeatureCard 
              icon={<Calendar className="text-emerald-600" />}
              title="Campanhas e Sorteios"
              description="Crie sorteios automáticos baseados em vendas para engajar seus clientes e aumentar o faturamento."
            />
            <FeatureCard 
              icon={<Wallet className="text-amber-600" />}
              title="Gestão de Finanças"
              description="Fluxo de caixa, contas a pagar/receber e conciliação bancária simplificada."
            />
            <FeatureCard 
              icon={<MessageSquare className="text-sky-600" />}
              title="Mensagens Agéis"
              description="Modelos de mensagens prontas para cobrança e marketing via WhatsApp com um clique."
            />
            <FeatureCard 
              icon={<UserCog className="text-rose-600" />}
              title="Gerenciar Funcionários"
              description="Controle de acessos, permissões específicas e acompanhamento de desempenho por vendedor."
            />
            <FeatureCard 
              icon={<Briefcase className="text-slate-600" />}
              title="Gestão Empresarial"
              description="Gestão de contratos e descontos em folha para parcerias corporativas e convênios."
            />
            <FeatureCard 
              icon={<TrendingUp className="text-green-600" />}
              title="Relatórios de Caixa"
              description="Abertura e fechamento de caixa detalhado com rastreabilidade total de cada centavo."
            />
            <FeatureCard 
              icon={<History className="text-blue-400" />}
              title="Histórico Completo"
              description="Rastreie cada alteração no sistema com logs de auditoria detalhados por usuário."
            />
          </div>
        </div>
      </section>
      
      {/* Plans Section */}
      <section id="planos" className="py-24 bg-slate-50 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-blue-600 font-bold tracking-widest uppercase text-sm mb-4">Planos & Preços</h2>
            <h3 className="text-3xl lg:text-5xl font-extrabold text-slate-900 mb-6">O plano ideal para o seu negócio</h3>
            <p className="text-slate-500 max-w-2xl mx-auto text-lg">
              Escolha a opção que melhor se adapta ao tamanho da sua empresa e comece a vender mais hoje mesmo.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 items-stretch">
            {(platformPlans.length > 0 ? platformPlans : defaultPlans).map((plan: any) => {
              const isFidelity = plan.key === 'fidelity' || plan.name === 'Mensal Fidelidade';
              const isLifetime = plan.key === 'lifetime' || plan.name === 'Vitalício Premium';
              
              return (
                <div 
                  key={plan.key || plan.id} 
                  className={`flex flex-col p-8 rounded-3xl border transition-all ${
                    isFidelity 
                      ? 'border-blue-400 bg-white shadow-2xl scale-105 z-10 ring-2 ring-blue-600/20' 
                      : 'border-slate-200 bg-white/50 hover:bg-white hover:shadow-lg'
                  }`}
                >
                  {isFidelity && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                      Melhor Desempenho + Completo
                    </div>
                  )}
                  {isLifetime && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
                      Eterno
                    </div>
                  )}
                  <div className="mb-8">
                    <h4 className="text-xl font-bold text-slate-900 mb-2">{plan.name}</h4>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900">
                        {typeof plan.price === 'number' ? `R$ ${plan.price.toFixed(2)}` : plan.price}
                      </span>
                      {!isLifetime && <span className="text-slate-500 text-sm">/mês</span>}
                      {isLifetime && <span className="text-slate-500 text-sm">/único</span>}
                    </div>
                  </div>
                  <ul className="space-y-4 mb-10 flex-grow">
                    {(plan.features || plan.description || "").toString().split(',').map((feature: string, idx: number) => {
                      const featureText = feature.trim();
                      const finalFeature = featureText === "Paga 10 Meses e Ganha 2 Meses Grátis" 
                        ? "Backup e restauração de dados" 
                        : featureText;
                      
                      return (
                        <li key={idx} className="flex items-start gap-3 text-sm text-slate-600 leading-tight">
                          <CheckCircle2 size={18} className="text-blue-600 shrink-0 mt-0.5" />
                          {finalFeature}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-auto">
                    <a 
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`w-full py-4 rounded-xl font-bold text-center transition-all flex items-center justify-center gap-2 ${
                        isFidelity
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      Selecionar {plan.name}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-slate-900 rounded-[2rem] p-12 lg:p-20 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10">
            <h3 className="text-3xl lg:text-5xl font-extrabold text-white mb-8">
              Pronto para transformar seu negócio?
            </h3>
            <p className="text-slate-400 text-lg mb-12 max-w-2xl mx-auto">
              Junte-se a centenas de empreendedores que já digitalizaram suas vendas com o Smart PDV PRO.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-10 py-5 bg-blue-600 text-white rounded-2xl font-bold text-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/40"
              >
                Começar Agora
              </a>
              <Link to="/login" className="px-10 py-5 bg-transparent text-white border border-slate-700 rounded-2xl font-bold text-xl hover:bg-slate-800 transition-all">
                Acessar Smart PDV PRO
              </Link>
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 text-slate-500 text-sm">
              <div className="flex items-center gap-2"><Star size={16} className="text-yellow-500 fill-yellow-500" /> 4.9/5 Avaliações</div>
              <div className="flex items-center gap-2"><ShieldCheck size={16} /> Sem cartão de crédito</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 px-6 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center overflow-hidden">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" onError={(e) => e.currentTarget.src = defaultLogoUrl} />

            </div>
            <span className="font-bold text-slate-800">{contextSettings?.name || "Smart PDV PRO"}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-slate-500">
            <a href="/smart-pdv-pro-projeto.zip" download className="font-semibold text-blue-600 hover:text-blue-700">
              Baixar projeto
            </a>
            <a href="#" className="hover:text-blue-600">Termos</a>
            <a href="#" className="hover:text-blue-600">Privacidade</a>
            <a href="#" className="hover:text-blue-600">Suporte</a>
          </div>
          <p className="text-sm text-slate-400">
            © 2026 {contextSettings?.name || "Smart PDV PRO"}. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description, badge }: { icon: React.ReactNode, title: string, description: string, badge?: string }) => (
  <div className="p-8 rounded-2xl border border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:border-blue-100 transition-all group relative">
    {badge && (
      <span className="absolute -top-3 right-4 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md whitespace-nowrap">
        {badge}
      </span>
    )}
    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h4 className="text-xl font-bold text-slate-900 mb-3">{title}</h4>
    <p className="text-slate-500 leading-relaxed">{description}</p>
  </div>
);