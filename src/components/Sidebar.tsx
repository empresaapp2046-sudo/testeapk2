// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { LayoutDashboard, ShoppingCart, Package, DollarSign, BarChart3, Settings, HelpCircle, X, LogOut, Shield, FileText, Lock, MessageSquareText, Trophy, Building, ChevronLeft, ChevronRight, User } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from '@tanstack/react-router';
import { useStore } from '../context/StoreContext';
import { LicenseBadge } from './LicenseBadge';


interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// Helper to check if a color is reddish
const isReddish = (hexColor: string) => {
    // Default to false if invalid
    if (!hexColor || !hexColor.startsWith('#')) return false;
    
    // Parse Hex
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    
    // Simple heuristic: High Red, relatively low Green/Blue
    // e.g. Red > 150, Green < 100, Blue < 100
    return r > 160 && g < 120 && b < 120;
};

interface MenuItemProps {
  to: string;
  icon: any;
  label: string;
  active: boolean;
  onClick: (e: React.MouseEvent, to: string) => void;
  isCollapsed: boolean;
  sidebarText: string;
  activeColor: string;
}

const MenuItem = ({ to, icon: Icon, label, active, onClick, isCollapsed, sidebarText, activeColor }: MenuItemProps) => (
  <Link 
    to={to} 
    onClick={(e) => onClick(e, to)}
    className={`flex items-center rounded-lg transition-colors ${active ? 'text-white' : 'hover:bg-white/10'} ${isCollapsed ? 'justify-center p-2' : 'gap-3 px-4 py-3'}`}
    style={{ 
        color: active ? '#ffffff' : sidebarText,
        backgroundColor: active ? activeColor : 'transparent',
    }}
    title={isCollapsed ? label : ''}
  >
    <Icon size={24} />
    {!isCollapsed && <span className="font-medium">{label}</span>}
  </Link>
);


export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { storeSlug } = useParams({ strict: false });
  
  const getRoute = (basePath: string) => {
    if (storeSlug) {
      // Se estamos em um contexto de loja, prefixamos todos os links internos com o slug
      // exceto links que já são absolutos ou o dashboard raiz da plataforma
      if (basePath.startsWith('/') && !basePath.startsWith(`/${storeSlug}`)) {
        return `/${storeSlug}${basePath}`;
      }
    }
    return basePath;
  };
  
  const [isCollapsed, setIsCollapsed] = useState(location.pathname === '/pos');
  const [prevPathname, setPrevPathname] = useState(location.pathname);

  
  const [showCartWarning, setShowCartWarning] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<string | null>(null);
  
  if (location.pathname !== prevPathname) {
      setPrevPathname(location.pathname);
      setIsCollapsed(location.pathname === '/pos');
  }

  const handleMenuClick = (e: React.MouseEvent, path: string) => {
      // Check if we are leaving POS and if there's an active cart
      if (location.pathname === '/pos' && path !== '/pos') {
          const tempCartRaw = localStorage.getItem('temp_cart');
          if (tempCartRaw) {
              try {
                  const arr = JSON.parse(tempCartRaw);
                  if (arr && arr.length > 0) {
                      e.preventDefault();
                      setPendingLocation(path);
                      setShowCartWarning(true);
                      return;
                  }
              } catch (err) {
                  console.warn("Failed to parse temp cart warning", err);
              }
          }
      }
      onClose();
  };

  const confirmNavigate = (clearCart: boolean) => {
      if (clearCart) {
          localStorage.removeItem('temp_cart');
          // Also clear standard selected customer maybe? We just do the cart for now as per requirement.
      }
      setShowCartWarning(false);
      onClose();
      if (pendingLocation) {
          navigate({ to: pendingLocation });
      }
  };


  const isActive = (path: string) => location.pathname === path;
  const { logout, currentUser, settings, isAdmin, effectiveUser, isFreeVersion } = useStore();

  const sidebarBg = settings.sidebarConfig?.backgroundColor || '#0f172a';
  const sidebarText = settings.sidebarConfig?.textColor || '#cbd5e1'; // slate-300 default equivalent
  const activeColor = settings.sidebarConfig?.activeItemColor || '#3b82f6'; // Default Blue
  
  const isBgRed = isReddish(sidebarBg);

  const isVisible = (menuKey: keyof typeof settings.menuVisibility) => {
    if (isAdmin) return true;
    
    // For store owners, show all menus (PlanGate handles restrictions)
    if (currentUser?.role === 'DonoLoja' || currentUser?.ownerId === currentUser?.id) {
        return true;
    }
    
    // For employees (Vendedor, SubGerente), filter based on granular permissions
    if (currentUser?.permissions) {
        switch (menuKey) {
            case 'dashboard': 
                return currentUser.permissions.dashboardVisual;
            case 'pos': 
                return currentUser.permissions.canAccessPOS;
            case 'customers': 
                return currentUser.permissions.canAccessCustomers;
            case 'companies': 
                return currentUser.permissions.canAccessInventory; // Tied to inventory for now
            case 'inventory': 
                return currentUser.permissions.canAccessInventory;
            case 'payables': 
                return currentUser.permissions.canAccessFinanceiro;
            case 'finance': 
                return currentUser.permissions.canAccessFinanceiro;
            case 'messages': 
                return currentUser.permissions.canAccessMessages;
            case 'raffles': 
                return currentUser.permissions.canAccessRaffles;
            case 'cashReports': 
                return currentUser.permissions.canAccessReports && currentUser.permissions.canAccessReportsCash;
            case 'corporateReports': 
                return currentUser.permissions.canAccessReports && currentUser.permissions.canAccessReportsCorporate;
            case 'gcec': 
                return currentUser.permissions.canAccessReports && currentUser.permissions.canAccessReportsCorporate;
            case 'reports': 
                return currentUser.permissions.canAccessReports && currentUser.permissions.canAccessReportsAI;
            case 'settings': 
                return currentUser.permissions.visibility; // Use the main visibility permission for settings access
            default: 
                return true;
        }
    }
    
    // Fallback for any other user type (e.g. guest or undefined permissions)
    if (!settings.menuVisibility) return true;
    return settings.menuVisibility[menuKey] !== false;
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 z-20 bg-black/50 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div 
        className={`fixed md:static inset-y-0 left-0 z-30 flex flex-col border-r border-slate-800 shrink-0 transition-all duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 shadow-2xl md:shadow-none h-full ${isCollapsed ? 'w-20' : 'w-64'}`}
        style={{ backgroundColor: sidebarBg, color: sidebarText }}
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          {!isCollapsed && (
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">SmartPDV Pró</h1>
              <p className="text-xs mt-1" style={{ color: sidebarText, opacity: 0.7 }}>Olá, {isAdmin ? 'Maicon Coutinho' : currentUser?.username}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="md:hidden hover:text-white" style={{ color: sidebarText }}>
                <X size={24} />
            </button>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {isVisible('dashboard') && (
            <MenuItem 
              to={getRoute("/dashboard")} 
              icon={LayoutDashboard} 
              label="Dashboard" 
              active={isActive(getRoute('/dashboard'))} 
              onClick={handleMenuClick} 
              isCollapsed={isCollapsed} 
              sidebarText={sidebarText} 
              activeColor={activeColor} 
            />
          )}
          {isVisible('pos') && <MenuItem to={getRoute("/pos")} icon={ShoppingCart} label="PDV / Vendas" active={isActive(getRoute('/pos'))} onClick={handleMenuClick} isCollapsed={isCollapsed} sidebarText={sidebarText} activeColor={activeColor} />}

          {isVisible('customers') && <MenuItem to={getRoute("/customers")} icon={User} label="Clientes" active={isActive(getRoute('/customers'))} onClick={handleMenuClick} isCollapsed={isCollapsed} sidebarText={sidebarText} activeColor={activeColor} />}
          {isVisible('companies') && <MenuItem to="/companies" icon={Building} label="Empresas" active={isActive('/companies')} onClick={handleMenuClick} isCollapsed={isCollapsed} sidebarText={sidebarText} activeColor={activeColor} />}
          {isVisible('inventory') && <MenuItem to="/inventory" icon={Package} label="Estoque & Produtos" active={isActive('/inventory')} onClick={handleMenuClick} isCollapsed={isCollapsed} sidebarText={sidebarText} activeColor={activeColor} />}
          {isVisible('payables') && <MenuItem to="/payables" icon={FileText} label="Contas a Pagar" active={isActive('/payables')} onClick={handleMenuClick} isCollapsed={isCollapsed} sidebarText={sidebarText} activeColor={activeColor} />}
          {isVisible('finance') && <MenuItem to="/finance" icon={DollarSign} label="Financeiro" active={isActive('/finance')} onClick={handleMenuClick} isCollapsed={isCollapsed} sidebarText={sidebarText} activeColor={activeColor} />}
          {isVisible('messages') && <MenuItem to="/messages" icon={MessageSquareText} label="Mensagens" active={isActive('/messages')} onClick={handleMenuClick} isCollapsed={isCollapsed} sidebarText={sidebarText} activeColor={activeColor} />}
          {isVisible('raffles') && <MenuItem to="/raffles" icon={Trophy} label="Sorteios" active={isActive('/raffles')} onClick={handleMenuClick} isCollapsed={isCollapsed} sidebarText={sidebarText} activeColor={activeColor} />}
          {isVisible('cashReports') && <MenuItem to="/cash-reports" icon={DollarSign} label="Relatórios de Caixa" active={isActive('/cash-reports')} onClick={handleMenuClick} isCollapsed={isCollapsed} sidebarText={sidebarText} activeColor={activeColor} />}
          {isVisible('corporateReports') && <MenuItem to="/corporate-reports" icon={BarChart3} label="Relatórios Empresariais" active={isActive('/corporate-reports')} onClick={handleMenuClick} isCollapsed={isCollapsed} sidebarText={sidebarText} activeColor={activeColor} />}
          {isVisible('gcec') && <MenuItem to="/gcec" icon={LayoutDashboard} label="GCEC" active={isActive('/gcec')} onClick={handleMenuClick} isCollapsed={isCollapsed} sidebarText={sidebarText} activeColor={activeColor} />}
          {isVisible('reports') && <MenuItem to="/reports" icon={BarChart3} label="Relatórios & IA" active={isActive('/reports')} onClick={handleMenuClick} isCollapsed={isCollapsed} sidebarText={sidebarText} activeColor={activeColor} />}
          
          {isAdmin && (
             <MenuItem to="/admin" icon={Shield} label="Administração" active={isActive('/admin')} onClick={handleMenuClick} isCollapsed={isCollapsed} sidebarText={sidebarText} activeColor={activeColor} />
          )}
          {(isAdmin || currentUser?.role === 'DonoLoja' || currentUser?.permissions?.canManageUsers) && (
              <MenuItem to="/employees" icon={Shield} label="Gerenciar Funcionários" active={isActive('/employees')} onClick={handleMenuClick} isCollapsed={isCollapsed} sidebarText={sidebarText} activeColor={activeColor} />
          )}

          <div className="pt-4 mt-4 border-t border-white/10">
            {isVisible('settings') && <MenuItem to="/settings" icon={Settings} label="Configurações" active={isActive('/settings')} onClick={handleMenuClick} isCollapsed={isCollapsed} sidebarText={sidebarText} activeColor={activeColor} />}
          </div>
        </nav>

        <div className="p-4 border-t border-white/10 flex flex-col gap-2">
          {!isCollapsed && <LicenseBadge />}
          <button 
              onClick={() => setIsCollapsed(!isCollapsed)} 
              className="p-3 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center"
              title={isCollapsed ? "Expandir" : "Minimizar"}
          >
              {isCollapsed ? <ChevronRight size={20} /> : <div className="flex items-center gap-2"><ChevronLeft size={20} /> <span>Minimizar</span></div>}
          </button>
          
          <button 
              onClick={() => { logout(); onClose(); }} 
              className={`p-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${isBgRed ? 'text-black hover:bg-black/10' : 'text-red-400 hover:bg-red-500/10 hover:text-red-300'}`}
              title="Sair"
          >
              <LogOut size={20} />
              {!isCollapsed && <span>Sair</span>}
          </button>

          {/* Admin Access Lock - Only shown if not admin */}
          {currentUser?.role !== 'admin' && (
              <Link 
                to="/login"
                onClick={onClose}
                className="p-3 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors text-center"
                title="Acesso Administrativo"
              >
                  <Lock size={18} />
              </Link>
          )}
        </div>
        {!isCollapsed && (
            <div className="pb-4 text-xs text-center opacity-60">
                v1.1.0 (Auth)
            </div>
        )}
      </div>

      {showCartWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm text-center">
            <ShoppingCart size={48} className="mx-auto text-blue-500 mb-4" />
            <h3 className="text-xl font-bold bg-slate-800 text-transparent bg-clip-text mb-2">Venda em Andamento!</h3>
            <p className="text-slate-600 text-sm mb-6">Você tem itens na sua cesta de vendas. Deseja manter ou zerar o carrinho ao sair?</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => confirmNavigate(false)} 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors"
              >
                Sair e Deixar na Cesta
              </button>
              <button 
                onClick={() => confirmNavigate(true)} 
                className="w-full bg-red-100 hover:bg-red-200 text-red-700 font-medium py-2.5 rounded-lg transition-colors"
              >
                Sair e Zerar Cesta
              </button>
              <button 
                onClick={() => setShowCartWarning(false)} 
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
