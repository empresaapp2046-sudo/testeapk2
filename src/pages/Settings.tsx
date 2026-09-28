// @ts-nocheck
import { playNotificationSound } from "../utils/sounds";
import React, { useRef, useState, useEffect } from 'react';
import { useStore, defaultPlans } from '../context/StoreContext';
import { 
    Save, ChevronRight, ChevronLeft, PieChart, Download, Upload, Image as ImageIcon, 
    ChevronDown, ChevronUp, Printer, Layout, Key, Database, Building2, CheckCircle, 
    HelpCircle, Phone, Mail, MessageCircle, Clock, Unlock, Lock, Palette, AlertTriangle, 
    X, Loader2, CreditCard, Wifi, WifiOff, Check, Zap, Cloud, User, Power, Info, 
    Trash2, Archive, RefreshCw, Eye, EyeOff, Plus, Minus, Link as LinkIcon, Shield, 
    LayoutDashboard, Settings as SettingsIcon, Store, ExternalLink, GripVertical, 
    Copy, Bell, Play, FileText, UploadCloud, Video, Ticket, Terminal, FolderOpen
} from 'lucide-react';
import { CompanySettings, PlanConfig } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import { FolderBackupCard } from '../components/FolderBackupCard';

// ... (SettingsSection and helpers remain same)
const SettingsSection = ({ title, icon: Icon, children, isOpen, onToggle, locked = false }: any) => {
    return (
        <div className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4 transition-all ${locked ? 'opacity-70' : ''}`}>
            <button 
                onClick={locked ? undefined : onToggle}
                className={`w-full p-5 flex items-center justify-between transition-colors ${isOpen ? 'bg-slate-50 border-b border-slate-100' : 'hover:bg-slate-50'} ${locked ? 'cursor-not-allowed bg-slate-50' : ''}`}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isOpen ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                        {locked ? <Lock size={20} className="text-slate-400"/> : <Icon size={20} />}
                    </div>
                    <span className={`font-bold text-lg ${isOpen ? 'text-slate-800' : 'text-slate-600'}`}>{title}</span>
                </div>
                <div className="text-slate-400">
                    {locked ? <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Bloqueado</span> : (isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />)}
                </div>
            </button>
            
            {isOpen && !locked && (
                <div className="p-6 animate-fade-in">
                    {children}
                </div>
            )}
        </div>
    );
};

const getCooldown = (lastDate?: string | null) => {
    if (!lastDate) return { blocked: false, days: 0 };
    const last = new Date(lastDate).getTime();
    const now = Date.now();
    const diffMs = now - last;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays >= 7) return { blocked: false, days: 0 };
    return { blocked: true, days: Math.ceil(7 - diffDays) };
};

export const Settings = () => {
  const { 
    settings, updateSettings, backupData, restoreData, activateLicense, 
    currentUser, licenseKeys, isFreeVersion, isAdmin, updateUserCredentials, 
    saveCloudDataToLocal, uploadLocalDataToCloud, clearLocalData, cleanupOldData, 
    products, sales, customers, effectiveUser,
    cashSession, cashTransactions, lastClosedSession, platformPlans 
  } = useStore();
  const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [activationKey, setActivationKey] = useState('');
  const [timeLeft, setTimeLeft] = useState<string>('');
  
  // Backup & Restore State
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingBackupContent, setPendingBackupContent] = useState<string | null>(null);
  const [restorePassword, setRestorePassword] = useState('');
  
  // Restore Success State
  const [isRestoreSuccess, setIsRestoreSuccess] = useState(false);
  const [restoredUserName, setRestoredUserName] = useState('');
  const [restoreType, setRestoreType] = useState<'cloud' | 'local'>('local');
 
  // Manual Deletion Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteOptions, setDeleteOptions] = useState({
      all: false,
      revenues: false,
      payables: false,
      sales: false
  });
 
  // Sync Conflict Modal
  const [showSyncConflictModal, setShowSyncConflictModal] = useState(false);
 
  // Variation Settings States
  const [newSizeSettings, setNewSizeSettings] = useState('');
  const [newColorSettings, setNewColorSettings] = useState('');
  const [newNumberSettings, setNewNumberSettings] = useState('');
  const [showVariationDeleteModal, setShowVariationDeleteModal] = useState(false);
  const [variationDeleteType, setVariationDeleteType] = useState<'size' | 'color' | 'number' | null>(null);

  // Confirmation Config for Actions
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, isDangerous?: boolean, confirmText?: string} | null>(null);
 
  // ... (User Edit State and Hooks remain same)
  const [editUserTab, setEditUserTab] = useState<'username' | 'password' | 'email'>('username');
  const [userForm, setUserForm] = useState({
      newValue: '',
      verifyUser: '',
      verifyEmail: '',
      verifyPass: ''
  });
 
  const [showTextBackup, setShowTextBackup] = useState(false);
  const [backupText, setBackupText] = useState('');
  const [restoreText, setRestoreText] = useState('');

  const toggleSection = (id: string) => {
      setOpenSection(openSection === id ? null : id);
  };
 
  const targetUser = effectiveUser || currentUser;
  const currentKeyData = licenseKeys.find(k => k.key === targetUser?.licenseKey);
  const isLifetime = currentKeyData?.type === 'lifetime' || (targetUser?.licenseKey && !targetUser?.licenseExpiry) || currentUser?.role === 'admin';
  
  // IMPORTANT: Plan Distinction Logic Updated
  // Allow sync if: Admin OR Plan allows it OR Manual Override in User Record
  const currentPlan = settings.customPlans?.find(p => p.key === targetUser?.licenseKey) || platformPlans.find(p => p.key === targetUser?.licenseKey) || defaultPlans.find(p => p.key === targetUser?.licenseKey);
  const isFidelityPlan = false; // Sistema 100% local: sincronização em nuvem desativada

  const handleCashRegisterToggle = () => {
    if (settings.cashRegisterEnabled) {
      // Trying to disable
      if (cashSession) {
        alert("Não é possível desativar o controle de caixa com um caixa aberto. Por favor, feche o caixa primeiro.");
        return;
      }
      
      // Check if last closed session had a kept balance
      if (lastClosedSession && (lastClosedSession.keptAmount || 0) > 0) {
        alert(`Não é possível desativar o controle de caixa pois existe um saldo de R$ ${lastClosedSession.keptAmount?.toFixed(2)} pendente do último caixa. Por favor, abra o caixa, retire o saldo e feche-o com valor zerado.`);
        return;
      }
    }
    
    updateSettings({...settings, cashRegisterEnabled: !settings.cashRegisterEnabled});
  };

  const isVisible = (sectionKey: keyof SettingsVisibilityConfig) => {
    if (isAdmin) return true; // Admins always see everything to manage it
    if (!settings.settingsVisibility) return true;
    
    // If the visibility control itself is disabled, hide everything else for non-admins
    if (settings.settingsVisibility.visibility === false && sectionKey !== 'visibility') {
      return false;
    }
    
    return settings.settingsVisibility[sectionKey] !== false;
  };

  const toggleMenuVisibility = (key: keyof MenuVisibilityConfig) => {
    if (!settings.menuVisibility) return;
    updateSettings({
      menuVisibility: {
        ...settings.menuVisibility,
        [key]: !settings.menuVisibility[key]
      }
    });
  };

  const toggleSettingsVisibility = (key: keyof SettingsVisibilityConfig) => {
    if (!isAdmin) return; // Somente admin pode alterar
    
    const currentVisibility = settings.settingsVisibility || {
        visibility: true,
        companyData: true,
        userData: true,
        dataRetention: true,
        dashboardVisual: true,
        sidebarConfig: true,
        printerConfig: true,
        posConfig: true,
        backupRestore: true,
        cloudSync: true,
        license: true,
        plans: true,
        support: true,
    };

    updateSettings({
      settingsVisibility: {
        ...currentVisibility,
        [key]: !currentVisibility[key]
      }
    });
  };
  
  // --- AUTO-CORRECT CLOUD SETTING ---
  // Se o plano não permitir, FORÇA o cloudSyncEnabled para false.
  useEffect(() => {
      if (!isFidelityPlan && settings.cloudSyncEnabled) {
          // Force OFF without prompting, as permissions don't support it
          updateSettings({ ...settings, cloudSyncEnabled: false });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFidelityPlan, settings.cloudSyncEnabled]);

  const getPlanName = () => {
      if (currentUser?.role === 'admin') return "Versão Administrador";
      if (!currentKeyData) return "Versão Gratuita (Teste)";
      switch(currentKeyData.type) {
          case 'trial_30min': return 'Plano Teste (30 Min)';
          case 'monthly': return 'Plano Mensal';
          case 'monthly_fidelity': return 'Plano Mensal Fidelidade';
          case 'annual': return 'Plano Anual';
          case 'lifetime': return 'Plano Vitalício';
          default: return 'VendaSmart Pro';
      }
  };

  useEffect(() => {
    if (isLifetime) {
        setTimeLeft('Vitalício');
        return;
    }
    if (!targetUser?.licenseExpiry) {
        setTimeLeft('Indefinido');
        return;
    }
    const interval = setInterval(() => {
        const now = new Date();
        const expiry = new Date(targetUser.licenseExpiry!);
        const diff = expiry.getTime() - now.getTime();
        if (diff <= 0) {
            setTimeLeft('Expirado');
        } else {
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft(
                `${days.toString().padStart(2, '0')}d:${hours.toString().padStart(2, '0')}h:${minutes.toString().padStart(2, '0')}m:${seconds.toString().padStart(2, '0')}s`
            );
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetUser, isLifetime]);

  const handleUpdateUser = async () => {
      if (!userForm.newValue) return alert("Preencha o novo valor.");
      let verification = {};
      if (editUserTab === 'username') verification = { e: userForm.verifyEmail, p: userForm.verifyPass };
      else if (editUserTab === 'password') verification = { u: userForm.verifyUser, e: userForm.verifyEmail };
      else if (editUserTab === 'email') verification = { u: userForm.verifyUser, p: userForm.verifyPass };
      setIsProcessing(true);
      const result = await updateUserCredentials(editUserTab, verification, userForm.newValue);
      setIsProcessing(false);
      alert(result.message);
      if (result.success) {
          setUserForm({ newValue: '', verifyUser: '', verifyEmail: '', verifyPass: '' });
      }
  };

  const handleExecuteDelete = async () => {
      if (!deleteOptions.all && !deleteOptions.revenues && !deleteOptions.payables && !deleteOptions.sales) {
          alert("Selecione ao menos uma opção.");
          return;
      }
      setIsProcessing(true);
      try {
          const result = await cleanupOldData({
              revenues: deleteOptions.all || deleteOptions.revenues,
              payables: deleteOptions.all || deleteOptions.payables,
              sales: deleteOptions.all || deleteOptions.sales,
              forceAll: true // FIXED: Always force delete selected categories in manual mode
          });
          alert(`Limpeza concluída!\n\n${result.deletedSales} vendas excluídas.\n${result.deletedRecords} registros financeiros excluídos.`);
          setShowDeleteModal(false);
          setDeleteOptions({ all: false, revenues: false, payables: false, sales: false });
      } catch (e: any) {
          alert("Erro ao excluir dados: " + e.message);
      } finally {
          setIsProcessing(false);
      }
  };

  const handleDownloadBackup = async () => {
    // Allows backup if NOT using Cloud Sync (Available for Basic/Annual/Lifetime plans or Fidelity with Sync OFF)
    // CloudSync is auto-disabled for non-fidelity by the useEffect above
    if (isFreeVersion || settings.cloudSyncEnabled) return;
    setIsProcessing(true);
    try {
        const content = await backupData();
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${currentUser?.username || 'smartpdv'}_${new Date().toISOString().split('T')[0]}.enc`;
        a.click();
    } catch (e: any) {
        alert("Erro ao gerar backup: " + e.message);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (event.target?.result) {
            setPendingBackupContent(event.target.result as string);
            setRestorePassword('');
            setShowPasswordModal(true); 
        }
      };
      reader.readAsText(file);
      e.target.value = ''; 
    }
  };

  const confirmRestoreWithPassword = async () => {
      if (!pendingBackupContent || !restorePassword) return;
      setIsProcessing(true);
      try {
          const result = await restoreData(pendingBackupContent, restorePassword);
          setRestoredUserName(currentUser?.username || 'Usuário');
          if (result.isCloud) {
              setRestoreType('cloud');
          } else {
              setRestoreType('local');
          }
          setIsRestoreSuccess(true);
          setShowPasswordModal(false);
          setPendingBackupContent(null);
          setRestorePassword('');
      } catch (e: any) {
          alert(e.message); // Show specific error (e.g. invalid password)
      } finally {
          setIsProcessing(false);
      }
  };

  const handleManualRestart = () => {
      window.dispatchEvent(new Event('app:soft_reset'));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateSettings({...settings, logo: reader.result as string});
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleActivateKey = () => {
      if (!currentUser) return;
      if (isLifetime) return; 
      if (!activationKey.trim()) {
          alert("Por favor, insira uma chave válida.");
          return;
      }
      const result = activateLicense(activationKey, currentUser.username);
      alert(result.message);
      if (result.success) {
          setActivationKey('');
      }
  };

  const toggleWidget = (key: keyof typeof settings.dashboardWidgets) => {
      if (key === 'lists') {
         updateSettings({
            ...settings,
            dashboardWidgets: {
                ...settings.dashboardWidgets,
                lists: !settings.dashboardWidgets.lists
            }
         });
         return;
      }
      const widget = settings.dashboardWidgets[key as keyof Omit<typeof settings.dashboardWidgets, 'lists'>];
      updateSettings({
          ...settings,
          dashboardWidgets: {
              ...settings.dashboardWidgets,
              [key]: { ...widget, enabled: !widget.enabled }
          }
      });
  };

  const updateWidgetRange = (key: keyof Omit<typeof settings.dashboardWidgets, 'lists'>, days: number) => {
    const widget = settings.dashboardWidgets[key];
    updateSettings({
        ...settings,
        dashboardWidgets: {
            ...settings.dashboardWidgets,
            [key]: { ...widget, range: Math.min(30, Math.max(0, days)) }
        }
    });
  };

  const updateRetention = (key: 'revenues' | 'payables' | 'sales', months: number) => {
      updateSettings({
          ...settings,
          dataRetention: {
              ...settings.dataRetention,
              [key]: months
          } as any
      });
  };

  // --- PLAN MANAGEMENT FOR ADMIN ---
  const updatePlanConfig = (key: string, updates: Partial<PlanConfig>) => {
      const updatedPlans = settings.customPlans?.map(p => 
          p.key === key ? { ...p, ...updates } : p
      ) || [];
      updateSettings({ ...settings, customPlans: updatedPlans });
  };

  const addPlanFeature = (planKey: string) => {
      const plan = settings.customPlans?.find(p => p.key === planKey);
      if (plan) {
          const newFeatures = [...plan.features, "Novo Benefício"];
          updatePlanConfig(planKey, { features: newFeatures });
      }
  };

  const updatePlanFeature = (planKey: string, index: number, value: string) => {
      const plan = settings.customPlans?.find(p => p.key === planKey);
      if (plan) {
          const newFeatures = [...plan.features];
          newFeatures[index] = value;
          updatePlanConfig(planKey, { features: newFeatures });
      }
  };

  const removePlanFeature = (planKey: string, index: number) => {
      const plan = settings.customPlans?.find(p => p.key === planKey);
      if (plan) {
          const newFeatures = plan.features.filter((_, i) => i !== index);
          updatePlanConfig(planKey, { features: newFeatures });
      }
  };

  // --- UPDATED CLOUD TOGGLE LOGIC ---
  const handleCloudToggle = () => {
      if (!isFidelityPlan) return; // Strict block based on updated plan/manual logic

      if (settings.cloudSyncEnabled) {
          // Turning OFF
          setConfirmConfig({
              isOpen: true,
              title: "Pausar Sincronização em Nuvem?",
              message: "Ao desativar, seus dados atuais serão SALVOS neste dispositivo para uso offline. Futuras alterações offline não serão enviadas para a nuvem até que você reative a opção.",
              isDangerous: false,
              confirmText: "Salvar Localmente e Desativar",
              onConfirm: () => {
                  saveCloudDataToLocal();
                  updateSettings({...settings, cloudSyncEnabled: false});
              }
          });
      } else {
          // Turning ON
          // Check if there is ANY data locally (from manual add or previous download)
          const hasLocalData = products.length > 0 || customers.length > 0 || sales.length > 0;
          
          if (hasLocalData) {
              setShowSyncConflictModal(true);
          } else {
              // No local data, safe to just enable (Simulate Restore to activate listeners)
              clearLocalData(); 
              updateSettings({...settings, cloudSyncEnabled: true});
          }
      }
  };

  // --- SYNC CONFLICT HANDLERS (UPDATED) ---
  const handleRestoreFromCloud = () => {
      // Option A: Just wipe local and Enable. 
      // Context useEffect will trigger snapshot and download data automatically.
      setConfirmConfig({
          isOpen: true,
          title: "Restaurar Backup da Nuvem",
          message: "ATENÇÃO: Todos os dados locais deste dispositivo serão substituídos pelos dados da nuvem. Continuar?",
          isDangerous: true,
          confirmText: "Sim, Restaurar",
          onConfirm: () => {
              clearLocalData();
              updateSettings({...settings, cloudSyncEnabled: true});
              setShowSyncConflictModal(false);
              
              // Trigger Success Screen
              setRestoredUserName(currentUser?.username || 'Nuvem');
              setRestoreType('cloud');
              setIsRestoreSuccess(true);
          }
      });
  };

  const handleOverwriteCloud = () => {
      // Option B: Upload local data
      setConfirmConfig({
          isOpen: true,
          title: "Sobrescrever Nuvem",
          message: "ATENÇÃO: Os dados existentes na nuvem serão substituídos pelos dados deste dispositivo. Continuar?",
          isDangerous: true,
          confirmText: "Sim, Sobrescrever",
          onConfirm: async () => {
              setIsProcessing(true);
              try {
                  await uploadLocalDataToCloud();
                  // The upload function in context now handles setting settings.cloudSyncEnabled = true remotely
                  setShowSyncConflictModal(false);
                  alert("Os dados foram salvos na nuvem e o botão de sincronização foi ativado com sucesso.");
              } catch (e: any) {
                  alert("Erro ao enviar dados: " + (e.message || "Desconhecido"));
              } finally {
                  setIsProcessing(false);
              }
          }
      });
  };

  // ... (Rest of UI components remain same)
  // [Content omitted for brevity, keeping existing structure identical]
  const imageId = "1WmSJpYViZregaF4oeCd3gFiBNHcD-so4";
  const imageUrl = `https://drive.google.com/thumbnail?id=${imageId}&sz=w1000`;
  const whatsappNumber = "5541988192359";

  const WidgetConfigRow = ({ label, configKey, helpText }: { label: string, configKey: keyof Omit<typeof settings.dashboardWidgets, 'lists'>, helpText: string }) => {
     const config = settings.dashboardWidgets[configKey];
     return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg hover:bg-slate-50 gap-3">
            <div className="flex items-center gap-3">
                <input 
                    type="checkbox" 
                    className="w-5 h-5 accent-primary cursor-pointer" 
                    checked={config.enabled} 
                    onChange={() => toggleWidget(configKey)} 
                />
                <div>
                    <span className="font-medium text-slate-700 block">{label}</span>
                    <span className="text-xs text-slate-400">{helpText}</span>
                </div>
            </div>
            
            {config.enabled && (
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200">
                    <Clock size={14} className="text-slate-400" />
                    <input 
                        type="number" 
                        min="0" 
                        max="30" 
                        className="w-12 text-center text-sm font-bold text-slate-700 outline-none" 
                        value={config.range} 
                        onChange={(e) => updateWidgetRange(configKey, parseInt(e.target.value) || 0)}
                    />
                    <span className="text-xs text-slate-500 w-16 text-right">
                        {config.range === 0 ? 'Hoje' : `${config.range} dias`}
                    </span>
                </div>
            )}
        </div>
     );
  };

  const RetentionSelect = ({ label, value, onChange }: { label: string, value: number, onChange: (v: number) => void }) => (
      <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          <select 
            className="p-2 border rounded-lg text-sm bg-slate-50 outline-none focus:border-blue-500 text-slate-600 font-bold"
            value={value || 0}
            onChange={(e) => onChange(parseInt(e.target.value))}
          >
              <option value="0">Nunca Excluir</option>
              <option value="1">1 Mês</option>
              <option value="2">2 Meses</option>
              <option value="3">3 Meses</option>
              <option value="6">6 Meses</option>
              <option value="12">12 Meses</option>
          </select>
      </div>
  );

  const licenseStatusColor = timeLeft === 'Expirado' ? 'text-red-400' : (isLifetime ? 'text-green-400' : 'text-blue-300');

  // Base definitions for plan styling, merged with dynamic config
  const basePlans = [
      {
          key: 'monthly_basic',
          period: "/mês",
          type: "OFFLINE",
          description: "Ideal para pequenos negócios locais.",
          isOnline: false,
          color: "bg-slate-50 border-slate-200",
          btnColor: "bg-slate-900 hover:bg-slate-800"
      },
      {
          key: 'annual_eco',
          period: "/ano",
          type: "OFFLINE",
          description: "Maior economia para longo prazo.",
          isOnline: false,
          color: "bg-blue-50 border-blue-200",
          btnColor: "bg-blue-600 hover:bg-blue-700"
      },
      {
          key: 'lifetime',
          period: "único",
          type: "OFFLINE",
          description: "Pague uma vez, use para sempre.",
          isOnline: false,
          color: "bg-purple-50 border-purple-200",
          btnColor: "bg-purple-600 hover:bg-purple-700"
      },
      {
          key: 'fidelity',
          period: "/mês",
          type: "ONLINE HÍBRIDO",
          description: "Sincronização e segurança total.",
          isOnline: true,
          color: "bg-green-50 border-green-200 shadow-md ring-1 ring-green-300",
          btnColor: "bg-green-600 hover:bg-green-700"
      }
  ];

  // Merge base plans with custom settings
  const displayPlans = (settings.customPlans || platformPlans || defaultPlans || []).length > 0 
      ? (settings.customPlans || platformPlans || defaultPlans).map(customPlan => {
          const base = basePlans.find(b => b.key === customPlan.key) || {
              period: (customPlan as any).period || "",
              type: (customPlan as any).type || (customPlan.cloudSyncAllowed ? "Online Híbrido" : "Offline"),
              isOnline: (customPlan as any).isOnline || customPlan.cloudSyncAllowed || false,
              color: (customPlan as any).color || "bg-slate-50 border-slate-200",
              btnColor: (customPlan as any).btnColor || "bg-blue-600 hover:bg-blue-700"
          };
          return { ...base, ...customPlan };
      }).filter(p => isAdmin || p.isVisible !== false)
      : basePlans;

  const currentCooldown = React.useMemo(() => {
      if (!currentUser) return { blocked: false, days: 0 };
      if (isAdmin) return { blocked: false, days: 0 }; 
      if (editUserTab === 'username') return getCooldown(currentUser.lastUsernameChange);
      if (editUserTab === 'password') return getCooldown(currentUser.lastPasswordChange);
      if (editUserTab === 'email') return getCooldown(currentUser.lastEmailChange);
      return { blocked: false, days: 0 };
  }, [currentUser, editUserTab, isAdmin]);

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-slate-800 mb-6">Configurações</h2>
        
        {/* --- RESTORE SUCCESS OVERLAY --- */}
        {isRestoreSuccess && (
         <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-emerald-600 to-teal-800 text-white animate-fade-in p-6 text-center">
            
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 animate-bounce shadow-xl backdrop-blur-sm border border-white/30">
               {restoreType === 'cloud' ? <Cloud size={48} className="text-white" /> : <CheckCircle size={48} className="text-white" />}
            </div>

            {restoreType === 'cloud' ? (
                <>
                    <h2 className="text-3xl font-bold mb-2">Restauração Online Realizada!</h2>
                    <p className="text-emerald-100 text-lg mb-8 max-w-md">
                        Restauração online realizada com sucesso. Entre novamente com seu usuário e senha para recarregar.
                    </p>
                </>
            ) : (
                <>
                    <h2 className="text-3xl font-bold mb-2">Seus dados foram restaurados!</h2>
                    <p className="text-emerald-100 text-lg mb-8 max-w-md">
                        Para restaurar o backup dos seus dados referentes a clientes, produtos, vendas e relatórios você deve fazer a restauração do backup manual.
                    </p>
                </>
            )}

            <div className="bg-white/10 rounded-xl p-6 backdrop-blur-md border border-white/20 w-full max-w-sm mb-10">
               <div className="flex justify-between items-center">
                  <span className="text-emerald-200 text-xs font-bold uppercase">Usuário</span>
                  <span className="font-bold text-white">{restoredUserName}</span>
               </div>
            </div>

            <button 
                onClick={handleManualRestart}
                className="px-8 py-4 bg-white text-emerald-800 font-bold text-lg rounded-xl shadow-2xl hover:bg-emerald-50 hover:scale-105 transition-all transform active:scale-95 flex items-center gap-3 animate-pulse"
            >
                <Power size={24} />
                REINICIAR E ENTRAR
            </button>
         </div>
       )}

       {/* --- ADMIN VISIBILITY CONTROLS --- */}
       {isAdmin && isVisible('visibility') && (
          <SettingsSection 
            title="Controle de Visibilidade (ADM)" 
            icon={Shield} 
            isOpen={openSection === 'visibility'} 
            onToggle={() => toggleSection('visibility')}
          >
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <LayoutDashboard size={16} /> Visibilidade do Menu Lateral
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: 'dashboard', label: 'Dashboard' },
                    { key: 'pos', label: 'PDV / Vendas' },
                    { key: 'companies', label: 'Empresas' },
                    { key: 'inventory', label: 'Estoque & Clientes' },
                    { key: 'payables', label: 'Contas a Pagar' },
                    { key: 'finance', label: 'Financeiro' },
                    { key: 'messages', label: 'Mensagens' },
                    { key: 'raffles', label: 'Sorteios' },
                    { key: 'cashReports', label: 'Relatórios de Caixa' },
                    { key: 'corporateReports', label: 'Relatórios Empresariais' },
                    { key: 'reports', label: 'Relatórios & IA' },
                    { key: 'settings', label: 'Configurações' },
                  ].map(({ key, label }) => {
                    const value = settings.menuVisibility?.[key as keyof MenuVisibilityConfig] ?? true;
                    return (
                      <label key={key} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-all">
                        <span className="text-sm font-medium text-slate-600">{label}</span>
                        <div className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-slate-300'}`}>
                          <input 
                            type="checkbox" 
                            checked={value} 
                            onChange={() => toggleMenuVisibility(key as keyof MenuVisibilityConfig)}
                            className="sr-only"
                          />
                          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                  <SettingsIcon size={16} /> Visibilidade das Seções de Configurações
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { key: 'visibility', label: 'Controle de Visibilidade (ADM)' },
                    { key: 'companyData', label: 'Dados da Empresa' },
                    { key: 'userData', label: 'Dados do Usuário' },
                    { key: 'dataRetention', label: 'Definições de dados de cadastros' },
                    { key: 'dashboardVisual', label: 'Visualização Dashboard' },
                    { key: 'notifications', label: 'Notificações e Alertas' },
                    { key: 'sidebarConfig', label: 'Definições do Menu Lateral' },
                    { key: 'printerConfig', label: 'Impressora PDV' },
                    { key: 'backupRestore', label: 'Backup e Restauração' },
                    { key: 'license', label: 'Licença' },
                    { key: 'plans', label: 'Nossos Planos' },
                    { key: 'support', label: 'Suporte' },
                  ].map(({ key, label }) => {
                    const value = settings.settingsVisibility?.[key as keyof SettingsVisibilityConfig] ?? true;
                    return (
                      <label key={key} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                        <span className="text-sm font-medium text-slate-600">{label}</span>
                        <div className={`relative w-11 h-6 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-slate-300'}`}>
                          <input 
                            type="checkbox" 
                            checked={value} 
                            disabled={!isAdmin}
                            onChange={() => toggleSettingsVisibility(key as keyof SettingsVisibilityConfig)}
                            className="sr-only"
                          />
                          <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-slate-500 italic">
                * Estas configurações afetam apenas usuários comuns. Administradores sempre verão todos os menus e seções.
              </p>
            </div>
          </SettingsSection>
        )}

        {isVisible('companyData') && (
          <SettingsSection 
            title="Dados da Empresa" 
            icon={Building2} 
            isOpen={openSection === 'company'} 
            onToggle={() => toggleSection('company')}
            locked={isFreeVersion}
          >
            <div className="space-y-4">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Logo da Vitrine</label>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="w-20 h-20 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                                {settings.logo ? <img src={settings.logo} className="w-full h-full object-contain" /> : <ImageIcon className="text-slate-400" size={32} />}
                            </div>
                            <div className="flex-1 w-full space-y-2">
                                <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-sm font-medium text-slate-700 shadow-sm transition-colors w-full sm:w-auto justify-center sm:justify-start">
                                    <Upload size={16} /> <span>Alterar Logo Vitrine</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                                </label>
                                <div className="relative">
                                    <LinkIcon size={14} className="absolute left-3 top-2.5 text-slate-400" />
                                    <input
                                        type="text"
                                        className="w-full pl-8 pr-3 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                                        placeholder="Ou cole o link da imagem"
                                        value={settings.logo?.startsWith('data:') ? '' : settings.logo || ''}
                                        onChange={(e) => updateSettings({...settings, logo: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Logo da Tela Splash</label>
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="w-20 h-20 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-center overflow-hidden shrink-0">
                                {settings.splashLogo ? <img src={settings.splashLogo} className="w-full h-full object-contain" /> : <ImageIcon className="text-blue-300" size={32} />}
                            </div>
                            <div className="flex-1 w-full space-y-2">
                                <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 border border-blue-700 rounded-lg cursor-pointer hover:bg-blue-700 text-sm font-medium text-white shadow-sm transition-colors w-full sm:w-auto justify-center sm:justify-start">
                                    <Upload size={16} /> <span>Alterar Logo Splash</span>
                                    <input 
                                        type="file" 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    updateSettings({...settings, splashLogo: reader.result as string});
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }} 
                                    />
                                </label>
                                <div className="relative">
                                    <LinkIcon size={14} className="absolute left-3 top-2.5 text-blue-300" />
                                    <input
                                        type="text"
                                        className="w-full pl-8 pr-3 py-2 border border-blue-100 rounded-lg text-sm bg-blue-50/30 focus:bg-white focus:outline-none focus:border-blue-500 transition-colors"
                                        placeholder="Link da logo splash individual"
                                        value={settings.splashLogo?.startsWith('data:') ? '' : settings.splashLogo || ''}
                                        onChange={(e) => updateSettings({...settings, splashLogo: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1">Nome da Empresa</label><input className="w-full border rounded-lg p-2" value={settings.name} onChange={e => updateSettings({...settings, name: e.target.value})}/></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-slate-600 mb-1">CPF / CNPJ</label><input className="w-full border rounded-lg p-2" value={settings.cnpj} onChange={e => updateSettings({...settings, cnpj: e.target.value})}/></div>
                    <div><label className="block text-sm font-medium text-slate-600 mb-1">Inscrição Estadual</label><input className="w-full border rounded-lg p-2" value={settings.stateRegistration || ''} onChange={e => updateSettings({...settings, stateRegistration: e.target.value})}/></div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Telefone da Empresa (DDD + Número, sem espaços. Ex: 41988192359)</label>
                    <input className="w-full border rounded-lg p-2" value={settings.phone || ''} onChange={e => updateSettings({...settings, phone: e.target.value})}/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Endereço da Empresa</label>
                    <input className="w-full border rounded-lg p-2" value={settings.address || ''} onChange={e => updateSettings({...settings, address: e.target.value})}/>
                </div>
                <div className="flex flex-col gap-2 mt-2">
                    <label className="text-sm font-medium text-slate-700">Posição do botão WhatsApp na Vitrine</label>
                    <select 
                        className="w-full border rounded-lg p-2 text-sm bg-slate-50" 
                        value={settings.whatsappVitrinePosition || 'bottom'} 
                        onChange={(e) => updateSettings({...settings, whatsappVitrinePosition: e.target.value as any})}
                    >
                        <option value="bottom">Flutuante (Parte de baixo)</option>
                        <option value="top">No Topo (Ao lado do menu Sobre Nós)</option>
                        <option value="none">Nenhum (Oculto)</option>
                    </select>
                </div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1">Chave Pix Padrão</label><input className="w-full border rounded-lg p-2" value={settings.pixKey} onChange={e => updateSettings({...settings, pixKey: e.target.value})}/></div>
                <div><label className="block text-sm font-medium text-slate-600 mb-1">Mensagem WhatsApp</label><textarea className="w-full border rounded-lg p-2 text-sm h-24" value={settings.whatsappMessageTemplate} onChange={e => updateSettings({...settings, whatsappMessageTemplate: e.target.value})}/></div>
                <div className="pt-2"><button className="bg-primary text-white px-6 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"><Save size={18} /> Salvar Dados</button></div>
            </div>
        </SettingsSection>
        )}


        {/* ... (User Data Section) ... */}
        {isVisible('userData') && (
          <SettingsSection title="Dados do Usuário" icon={User} isOpen={openSection === 'user_data'} onToggle={() => toggleSection('user_data')}>
            <div className="mb-4">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className={`flex-1 p-4 rounded-lg border flex flex-col items-center justify-center text-center transition-colors ${currentCooldown.blocked ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <span className="text-xs font-bold uppercase text-slate-500 mb-1">{editUserTab === 'username' && 'TROCA DE NOME'}{editUserTab === 'password' && 'TROCA DE SENHA'}{editUserTab === 'email' && 'TROCA DE EMAIL'}</span>
                        {currentCooldown.blocked ? (<><span className="text-lg font-bold text-red-600 flex items-center gap-2"><Lock size={18} /> Bloqueado ({currentCooldown.days}d)</span><span className="text-xs text-red-400 mt-1">Última: {new Date(editUserTab === 'username' ? (currentUser?.lastUsernameChange || 0) : editUserTab === 'password' ? (currentUser?.lastPasswordChange || 0) : (currentUser?.lastEmailChange || 0)).toLocaleDateString()}</span></>) : (<span className="text-lg font-bold text-green-700 flex items-center gap-2"><Unlock size={18} /> Liberado</span>)}
                    </div>
                </div>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                <button onClick={() => { setEditUserTab('username'); setUserForm({newValue:'', verifyUser:'', verifyEmail:'', verifyPass:''}); }} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${editUserTab === 'username' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Alterar Usuário</button>
                <button onClick={() => { setEditUserTab('password'); setUserForm({newValue:'', verifyUser:'', verifyEmail:'', verifyPass:''}); }} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${editUserTab === 'password' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Alterar Senha</button>
                <button onClick={() => { setEditUserTab('email'); setUserForm({newValue:'', verifyUser:'', verifyEmail:'', verifyPass:''}); }} className={`flex-1 py-2 text-sm font-bold rounded-md transition-colors ${editUserTab === 'email' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Alterar Email</button>
            </div>
            <div className={`space-y-4 ${currentCooldown.blocked ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                <div><label className="block text-sm font-medium text-slate-600 mb-1">{editUserTab === 'username' && 'Novo Nome de Usuário'}{editUserTab === 'password' && 'Nova Senha'}{editUserTab === 'email' && 'Novo Email'}</label><input className="w-full border rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none" type={editUserTab === 'password' ? 'password' : 'text'} placeholder={editUserTab === 'email' ? 'exemplo@email.com' : 'Digite o novo valor'} value={userForm.newValue} onChange={(e) => setUserForm({...userForm, newValue: e.target.value})} disabled={currentCooldown.blocked} /></div>
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-100"><p className="text-xs font-bold text-slate-500 mb-3 uppercase tracking-wide flex items-center gap-1"><Lock size={12}/> Confirmação de Segurança</p><div className="space-y-3">{editUserTab !== 'username' && (<div><label className="block text-xs font-medium text-slate-500 mb-1">Usuário Atual</label><input className="w-full border rounded-lg p-2 text-sm" value={userForm.verifyUser} onChange={(e) => setUserForm({...userForm, verifyUser: e.target.value})} placeholder="Confirme seu usuário atual" disabled={currentCooldown.blocked} /></div>)}{editUserTab !== 'email' && (<div><label className="block text-xs font-medium text-slate-500 mb-1">Email Cadastrado</label><input className="w-full border rounded-lg p-2 text-sm" value={userForm.verifyEmail} onChange={(e) => setUserForm({...userForm, verifyEmail: e.target.value})} placeholder="Confirme seu email atual" disabled={currentCooldown.blocked} /></div>)}{editUserTab !== 'password' && (<div><label className="block text-xs font-medium text-slate-500 mb-1">Senha Atual</label><input type="password" className="w-full border rounded-lg p-2 text-sm" value={userForm.verifyPass} onChange={(e) => setUserForm({...userForm, verifyPass: e.target.value})} placeholder="Confirme sua senha atual" disabled={currentCooldown.blocked} /></div>)}</div></div>
                <button onClick={handleUpdateUser} disabled={isProcessing || currentCooldown.blocked} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">{isProcessing ? <Loader2 className="animate-spin" size={18}/> : <Save size={18} />}{currentCooldown.blocked ? `Bloqueado (Espere ${currentCooldown.days} dias)` : 'Salvar Alterações'}</button>
            </div>
        </SettingsSection>
        )}

        {/* BACKUP & EXPORTAÇÃO (LOCAL ONLY) */}
        {isLocal && (
          <SettingsSection title="Backup e Exportação" icon={Database} isOpen={openSection === 'backup_export'} onToggle={() => toggleSection('backup_export')}>
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 border border-blue-200 rounded-xl">
                <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                  <Terminal size={18} /> Ambiente Local Detectado
                </h4>
                <p className="text-sm text-blue-700 leading-relaxed mb-4">
                  Você está executando o <strong>Smart PDV PRO</strong> localmente. Seus dados operacionais estão sendo salvos automaticamente na pasta <code>data/</code> do projeto.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white/80 p-3 rounded-lg border border-blue-100">
                    <span className="text-xs font-bold text-blue-400 uppercase block mb-1">Localização dos Dados</span>
                    <span className="text-sm font-mono text-slate-600">/data/*.json</span>
                  </div>
                  <div className="bg-white/80 p-3 rounded-lg border border-blue-100">
                    <span className="text-xs font-bold text-blue-400 uppercase block mb-1">Modo de Operação</span>
                    <span className="text-sm font-bold text-green-600">Offline com Sinc. Online</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700">Backup Completo do Projeto</label>
                  <p className="text-xs text-slate-500">Gera um arquivo ZIP contendo todo o código-fonte e seus dados locais para backup ou transferência entre máquinas.</p>
                  <a
                    href="/smart-pdv-pro-projeto.zip"
                    download
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 shadow-lg transition-all"
                  >
                    <Download size={22} />
                    Baixar Projeto Completo (ZIP)
                  </a>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <h5 className="text-sm font-bold text-slate-700 mb-3">Atalhos e Facilidades</h5>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-4">
                      <div className="bg-slate-200 p-2 rounded-lg text-slate-600">
                        <Terminal size={20} />
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-sm">Automação de Inicialização</span>
                        <span className="text-xs text-slate-500 block mb-2">Use o arquivo <code>iniciar.bat</code> na raiz para abrir o sistema com um clique.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </SettingsSection>
        )}

        {/* PASTA DE DADOS NO COMPUTADOR */}
        <SettingsSection
          title="Pasta de dados no computador"
          icon={FolderOpen}
          isOpen={openSection === 'folder_backup'}
          onToggle={() => toggleSection('folder_backup')}
        >
          <FolderBackupCard />
        </SettingsSection>

        {/* ... (Data Retention Section) ... */}
        {isVisible('dataRetention') && (
          <SettingsSection title="Definições de dados de cadastros" icon={Archive} isOpen={openSection === 'data_retention'} onToggle={() => toggleSection('data_retention')} locked={isFreeVersion}>
            <div className="space-y-4">
                <div className="bg-orange-50 p-3 border border-orange-200 rounded-lg text-xs text-orange-800 flex gap-2"><AlertTriangle size={16} className="shrink-0" /><p>Configure o período máximo de armazenamento. Itens mais antigos que o período selecionado serão excluídos automaticamente para otimizar o sistema.</p></div>
                <RetentionSelect label="Excluir Receitas após:" value={settings.dataRetention?.revenues || 0} onChange={(v) => updateRetention('revenues', v)} />
                <RetentionSelect label="Excluir Despesas após:" value={settings.dataRetention?.payables || 0} onChange={(v) => updateRetention('payables', v)} />
                <RetentionSelect label="Excluir Planos/Vendas após:" value={settings.dataRetention?.sales || 0} onChange={(v) => updateRetention('sales', v)} />
                <div className="pt-4 border-t border-slate-100"><button onClick={() => setShowDeleteModal(true)} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-red-500/20 transition-all"><Trash2 size={18} /> Excluir Dados Agora</button></div>
            </div>
        </SettingsSection>
        )}

        {/* ... (Visual Dashboard Section) ... */}
        {isVisible('dashboardVisual') && (
          <SettingsSection title="Visualização Dashboard" icon={Layout} isOpen={openSection === 'dashboard'} onToggle={() => toggleSection('dashboard')} locked={isFreeVersion}>
            <p className="text-sm text-slate-500 mb-4">Configure quais cards exibir e o período de dados.</p>
            <div className="space-y-3"><WidgetConfigRow label="Resumo de Vendas" configKey="sales" helpText="Total vendido no período."/><WidgetConfigRow label="Contas a Receber" configKey="receivables" helpText="Valores a receber."/><WidgetConfigRow label="Contas a Pagar" configKey="payables" helpText="Valores a pagar."/><WidgetConfigRow label="Alertas de Urgência" configKey="alerts" helpText="Contas vencendo."/><WidgetConfigRow label="Aniversariantes" configKey="birthdays" helpText="Clientes fazendo aniversário."/><label className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer"><div className="flex items-center gap-3"><input type="checkbox" className="w-5 h-5 accent-primary" checked={settings.dashboardWidgets?.lists ?? true} onChange={() => toggleWidget('lists')} /><span className="font-medium text-slate-700">Listas Detalhadas</span></div></label></div>
          </SettingsSection>
        )}
        {isVisible('notifications') && (
          <SettingsSection title="Notificações e Alertas" icon={Bell} isOpen={openSection === 'notifications'} onToggle={() => toggleSection('notifications')} locked={isFreeVersion}>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-800">Ativar Notificações</h4>
                  <p className="text-sm text-slate-500">Habilita alertas no sistema.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={settings.notificationSettings?.enabled ?? false} onChange={(e) => updateSettings({ notificationSettings: { ...(settings.notificationSettings || {}), enabled: e.target.checked } as any })} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <h4 className="font-bold text-slate-800">Som de Notificação</h4>
                  <p className="text-sm text-slate-500">Tocar um som quando houver uma notificação.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={settings.notificationSettings?.soundEnabled ?? false} onChange={(e) => updateSettings({ notificationSettings: { ...(settings.notificationSettings || {}), soundEnabled: e.target.checked } as any })} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800">Configuração de Som</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Escolher Som</label>
                     <div className="flex items-center gap-2">
                       <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700" value={settings.notificationSettings?.selectedSound || 'chime1'} onChange={(e) => updateSettings({ notificationSettings: { ...(settings.notificationSettings || {}), selectedSound: e.target.value } as any })}>
                          <option value="chime1">Sino Suave</option>
                          <option value="chime2">Alerta Duplo</option>
                          <option value="synth1">Digital Pluck</option>
                          <option value="synth2">Acorde Positivo</option>
                          <option value="alert1">Alerta Grave</option>
                       </select>
                       <button onClick={() => playNotificationSound(settings.notificationSettings?.selectedSound || 'chime1')} className="p-3 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"><Play size={20}/></button>
                     </div>
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-1">Repetição do Alarme</label>
                     <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700" value={settings.notificationSettings?.alarmRepeat || 'none'} onChange={(e) => updateSettings({ notificationSettings: { ...(settings.notificationSettings || {}), alarmRepeat: e.target.value } as any })}>
                        <option value="none">Não repetir</option>
                        <option value="5m">A cada 5 minutos</option>
                        <option value="15m">A cada 15 minutos</option>
                        <option value="1h">A cada hora</option>
                     </select>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold text-slate-800">Eventos Notificados</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                     <input type="checkbox" className="w-5 h-5 accent-primary" checked={settings.notificationSettings?.alerts?.messages ?? true} onChange={(e) => updateSettings({ notificationSettings: { ...(settings.notificationSettings || {}), alerts: { ...(settings.notificationSettings?.alerts || {}), messages: e.target.checked } } as any })} />
                     <span className="font-medium text-slate-700">Novas Mensagens de Clientes</span>
                   </label>
                   <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                     <input type="checkbox" className="w-5 h-5 accent-primary" checked={settings.notificationSettings?.alerts?.payables ?? true} onChange={(e) => updateSettings({ notificationSettings: { ...(settings.notificationSettings || {}), alerts: { ...(settings.notificationSettings?.alerts || {}), payables: e.target.checked } } as any })} />
                     <span className="font-medium text-slate-700">Vencimento: Contas a Pagar</span>
                   </label>
                   <div className="flex flex-col gap-2 p-3 border rounded-lg">
                     <label className="flex items-center gap-3 cursor-pointer">
                       <input type="checkbox" className="w-5 h-5 accent-primary" checked={settings.notificationSettings?.alerts?.installments ?? true} onChange={(e) => updateSettings({ notificationSettings: { ...(settings.notificationSettings || {}), alerts: { ...(settings.notificationSettings?.alerts || {}), installments: e.target.checked } } as any })} />
                       <span className="font-medium text-slate-700">Vencimento: Parcelas (Vendas a Prazo)</span>
                     </label>
                     <div className="flex items-center gap-2 pl-8 mt-2">
                        <span className="text-sm text-slate-500">Antecedência:</span>
                        <input type="number" min="1" max="30" className="w-16 p-1 border rounded text-center" value={settings.notificationSettings?.installmentsAdvanceDays || 3} onChange={(e) => updateSettings({ notificationSettings: { ...(settings.notificationSettings || {}), installmentsAdvanceDays: parseInt(e.target.value) || 3 } as any })} />
                        <span className="text-sm text-slate-500">dias</span>
                     </div>
                   </div>
                   <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
                     <input type="checkbox" className="w-5 h-5 accent-primary" checked={settings.notificationSettings?.alerts?.lowStock ?? true} onChange={(e) => updateSettings({ notificationSettings: { ...(settings.notificationSettings || {}), alerts: { ...(settings.notificationSettings?.alerts || {}), lowStock: e.target.checked } } as any })} />
                     <span className="font-medium text-slate-700">Estoque Baixo</span>
                   </label>
                </div>
              </div>
            </div>
          </SettingsSection>
        )}

        {/* ... (Sidebar Section) ... */}
        {isVisible('sidebarConfig') && (
          <SettingsSection title="Definições do Menu Lateral" icon={Palette} isOpen={openSection === 'sidebar'} onToggle={() => toggleSection('sidebar')} locked={isFreeVersion}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label className="block text-sm font-medium text-slate-600 mb-2">Cor de Fundo</label><div className="flex items-center gap-3"><input type="color" className="w-12 h-12 p-1 border rounded cursor-pointer" value={settings.sidebarConfig?.backgroundColor || '#0f172a'} onChange={(e) => updateSettings({...settings, sidebarConfig: {...settings.sidebarConfig, backgroundColor: e.target.value, textColor: settings.sidebarConfig?.textColor || '#cbd5e1', activeItemColor: settings.sidebarConfig?.activeItemColor || '#3b82f6'}})} /></div></div><div><label className="block text-sm font-medium text-slate-600 mb-2">Cor dos Textos</label><div className="flex items-center gap-3"><input type="color" className="w-12 h-12 p-1 border rounded cursor-pointer" value={settings.sidebarConfig?.textColor || '#cbd5e1'} onChange={(e) => updateSettings({...settings, sidebarConfig: {...settings.sidebarConfig, textColor: e.target.value, backgroundColor: settings.sidebarConfig?.backgroundColor || '#0f172a', activeItemColor: settings.sidebarConfig?.activeItemColor || '#3b82f6'}})} /></div></div><div><label className="block text-sm font-medium text-slate-600 mb-2">Cor Selecionado</label><div className="flex items-center gap-3"><input type="color" className="w-12 h-12 p-1 border rounded cursor-pointer" value={settings.sidebarConfig?.activeItemColor || '#3b82f6'} onChange={(e) => updateSettings({...settings, sidebarConfig: {...settings.sidebarConfig, activeItemColor: e.target.value, textColor: settings.sidebarConfig?.textColor || '#cbd5e1', backgroundColor: settings.sidebarConfig?.backgroundColor || '#0f172a'}})} /></div></div></div>
          </SettingsSection>
        )}

        {/* ... (Printer Section) ... */}
        
        {isVisible('financialConfig') && (
          <SettingsSection title="Separação de Lucros (Dízimo, Investimentos, etc)" icon={PieChart} isOpen={openSection === 'profit_sep'} onToggle={() => toggleSection('profit_sep')}>
            <div className="space-y-4">
              <p className="text-sm text-slate-600 mb-2">Defina porcentagens de lucros separados (ex: Dízimo, Reserva de Emergência) para visualizar no Painel Financeiro.</p>
              
              <div className="space-y-3">
                {(settings.profitSeparations || []).map((sep, idx) => (
                  <div key={sep.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      className="flex-1 p-2 border rounded text-sm"
                      placeholder="Nome (ex: Dízimo)"
                      value={sep.name}
                      onChange={e => {
                        const updated = [...(settings.profitSeparations || [])];
                        updated[idx].name = e.target.value;
                        updateSettings({ ...settings, profitSeparations: updated });
                      }}
                    />
                    <input
                      type="number"
                      className="w-24 p-2 border rounded text-sm"
                      placeholder="%"
                      value={sep.percentage}
                      onChange={e => {
                        const updated = [...(settings.profitSeparations || [])];
                        updated[idx].percentage = parseFloat(e.target.value) || 0;
                        updateSettings({ ...settings, profitSeparations: updated });
                      }}
                    />
                    <span className="text-sm text-slate-500 font-bold">%</span>
                    <button
                      className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                      onClick={() => {
                        const updated = (settings.profitSeparations || []).filter((_, i) => i !== idx);
                        updateSettings({ ...settings, profitSeparations: updated });
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                className="w-full py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 flex justify-center items-center gap-1"
                onClick={() => {
                  const updated = [...(settings.profitSeparations || []), { id: Date.now().toString(), name: '', percentage: 10 }];
                  updateSettings({ ...settings, profitSeparations: updated });
                }}
              >
                <Plus size={16} /> Adicionar Opção
              </button>
            </div>
          </SettingsSection>
        )}

        {isVisible('posConfig') && (
          <SettingsSection title="Configurações do PDV" icon={LayoutDashboard} isOpen={openSection === 'pos'} onToggle={() => toggleSection('pos')}>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                <div>
                  <p className="font-medium text-slate-800">Abertura e fechamento de caixa</p>
                  <p className="text-xs text-slate-500">Ative ou desative a necessidade de abrir/fechar caixa no PDV.</p>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${settings.cashRegisterEnabled ? 'bg-green-500' : 'bg-slate-300'}`} onClick={handleCashRegisterToggle}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${settings.cashRegisterEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                <div>
                  <p className="font-medium text-slate-800">Liberação de parcelas além do limite da empresa</p>
                  <p className="text-xs text-slate-500">Permite vender em mais parcelas que o limite da empresa, creditando o excedente como dívida pessoal.</p>
                </div>
                <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${settings.allowExceedCompanyInstallmentLimit ? 'bg-green-500' : 'bg-slate-300'}`} onClick={() => updateSettings({...settings, allowExceedCompanyInstallmentLimit: !settings.allowExceedCompanyInstallmentLimit})}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${settings.allowExceedCompanyInstallmentLimit ? 'translate-x-6' : 'translate-x-0'}`} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <p className="font-bold text-slate-700 mb-3">Visualização de Produtos e Planos</p>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { id: 'grid-photo', label: 'Com Foto (Grade)', desc: 'Exibe imagem, código, nome e valor em cartões.' },
                    { id: 'list-photo', label: 'Lista Vertical (Com Foto)', desc: 'Exibe miniatura, código, nome e valor em lista.' },
                    { id: 'list-detailed', label: 'Lista Vertical (Sem Foto)', desc: 'Exibe código, nome e valor um abaixo do outro.' },
                    { id: 'grid-compact', label: 'Lista em Grade (Sem Foto)', desc: 'Exibe código, nome e valor em cartões compactos.' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => updateSettings({ ...settings, posDisplayMode: mode.id as any })}
                      className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                        settings.posDisplayMode === mode.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-slate-100 hover:border-slate-200 bg-white'
                      }`}
                    >
                      <div className="text-left">
                        <p className={`font-bold ${settings.posDisplayMode === mode.id ? 'text-blue-700' : 'text-slate-700'}`}>{mode.label}</p>
                        <p className="text-xs text-slate-500">{mode.desc}</p>
                      </div>
                      {settings.posDisplayMode === mode.id && (
                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white">
                          <Check size={14} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SettingsSection>
        )}

        {isVisible('printerConfig') && (
          <SettingsSection title="Impressora PDV" icon={Printer} isOpen={openSection === 'printer'} onToggle={() => toggleSection('printer')} locked={isFreeVersion}>
             <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                  <div><p className="font-medium text-slate-800">Habilitar Impressão</p></div>
                  <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${settings.printerConfig?.enabled ? 'bg-green-500' : 'bg-slate-300'}`} onClick={() => updateSettings({...settings, printerConfig: {...settings.printerConfig, enabled: !settings.printerConfig.enabled}})}>
                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${settings.printerConfig?.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Largura do Papel</label>
                    <select className="w-full border rounded-lg p-2 text-sm" value={settings.printerConfig?.paperWidth || '80mm'} onChange={(e) => updateSettings({...settings, printerConfig: {...settings.printerConfig, paperWidth: e.target.value as any}})}>
                      <option value="58mm">58mm</option>
                      <option value="80mm">80mm</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Impressão Automática</label>
                    <select className="w-full border rounded-lg p-2 text-sm" value={settings.printerConfig?.autoPrint ? 'yes' : 'no'} onChange={(e) => updateSettings({...settings, printerConfig: {...settings.printerConfig, autoPrint: e.target.value === 'yes'}})}>
                      <option value="no">Não</option>
                      <option value="yes">Sim</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Nome no Cupom do Sorteio</label>
                    <select className="w-full border rounded-lg p-2 text-sm" value={settings.printerConfig?.fillCustomerOnRaffleCoupon !== false ? 'yes' : 'no'} onChange={(e) => updateSettings({...settings, printerConfig: {...settings.printerConfig, fillCustomerOnRaffleCoupon: e.target.value === 'yes'}})}>
                      <option value="yes">Sim (Nome do Cliente)</option>
                      <option value="no">Não (Em branco - Linha)</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Tamanho da Fonte (px)</label>
                    <input 
                      type="number" 
                      min="8" max="24"
                      className="w-full border rounded-lg p-2 text-sm" 
                      value={settings.receiptFontSize || 11} 
                      onChange={(e) => updateSettings({...settings, receiptFontSize: parseInt(e.target.value) || 11})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">Estilo da Letra</label>
                    <select 
                      className="w-full border rounded-lg p-2 text-sm" 
                      value={settings.receiptFontWeight || 'normal'} 
                      onChange={(e) => updateSettings({...settings, receiptFontWeight: e.target.value})}
                    >
                      <option value="normal">Normal</option>
                      <option value="bold">Negrito (Bold)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden flex flex-col items-center p-4 bg-slate-100">
                  <h4 className="font-bold text-slate-600 mb-2">Pré-visualização do Cupom</h4>
                  <div 
                    style={{
                      width: settings.printerConfig?.paperWidth === '58mm' ? '58mm' : '80mm', 
                      fontFamily: "'Courier New', Courier, monospace", 
                      fontSize: `${settings.receiptFontSize || 11}px`, 
                      fontWeight: settings.receiptFontWeight || 'normal', 
                      lineHeight: 1.2, 
                      color: '#000', 
                      background: '#fff', 
                      padding: '10px', 
                      margin: '0 auto',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{textAlign: 'center', marginBottom: '10px'}}>
                      <h2 style={{fontSize: '14px', fontWeight: 'bold', margin: '0'}}>{settings.name || 'Smart PDV PRO'}</h2>
                      <div>{new Date().toLocaleDateString('pt-BR')} - {new Date().toLocaleTimeString('pt-BR')}</div>
                    </div>
                    <div style={{borderBottom: '1px dashed #000', marginBottom: '5px'}}></div>
                    <div style={{marginBottom: '5px'}}>
                      <div><strong>Cliente:</strong> João da Silva</div>
                      <div><strong>CPF:</strong> 123.456.789-00</div>
                    </div>
                    <div style={{borderBottom: '1px dashed #000', marginBottom: '5px'}}></div>
                    <div style={{marginBottom: '5px'}}>
                      <div style={{display: 'flex', fontWeight: 'bold', marginBottom: '2px'}}>
                         <span style={{flex: 1}}>Item</span>
                         <span style={{width: '30px', textAlign: 'center'}}>Qtd</span>
                         <span style={{width: '60px', textAlign: 'right'}}>Vl.Tot</span>
                      </div>
                      <div style={{display: 'flex', marginBottom: '2px'}}>
                        <span style={{flex: 1}}>Camiseta</span>
                        <span style={{width: '30px', textAlign: 'center'}}>1</span>
                        <span style={{width: '60px', textAlign: 'right'}}>59.90</span>
                      </div>
                    </div>
                    <div style={{borderBottom: '1px dashed #000', marginBottom: '5px'}}></div>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: 'bold'}}>
                      <span>TOTAL:</span>
                      <span>R$ 59.90</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  * Nota: Se a venda for para <strong>Cliente Balcão</strong>, o nome ficará sempre em branco no cupom de sorteio.
                </p>
             </div>
          </SettingsSection>
        )}

        <SettingsSection title="Sorteios & Gravação de Tela (Live)" icon={Video} isOpen={openSection === 'raffles'} onToggle={() => toggleSection('raffles')}>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-xl bg-slate-50">
              <div>
                <p className="font-bold text-slate-800">Gravação de Tela (Live) no Sorteio</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Permite aos operadores gravar a tela no momento do sorteio para transmissão ou salvamento de vídeo MP4.
                </p>
              </div>
              <div 
                className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${settings.enableScreenRecording !== false ? 'bg-green-500' : 'bg-slate-300'}`} 
                onClick={() => updateSettings({...settings, enableScreenRecording: !(settings.enableScreenRecording !== false)})}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${settings.enableScreenRecording !== false ? 'translate-x-6' : 'translate-x-0'}`} />
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-xl text-xs text-blue-900 flex items-start gap-2">
              <Info size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Nota de compatibilidade dos navegadores:</strong> Se o seu navegador restringir o recurso de gravação de tela em iFrames, o sistema oferecerá automaticamente alternativas como gravação via Câmera/Webcam ou gravação em aba independente.
              </div>
            </div>
          </div>
        </SettingsSection>

        {isVisible('printerConfig') && (
          <SettingsSection title="Etiquetas de Produtos" icon={Layout} isOpen={openSection === 'labels'} onToggle={() => toggleSection('labels')} locked={isFreeVersion}>
             <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                     <div>
                         <label className="block text-sm font-medium text-slate-600 mb-1">Formato do Papel</label>
                         <select className="w-full border rounded-lg p-2 text-sm bg-slate-50" value={settings.labelConfig?.paperType || 'A4'} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), paperType: e.target.value}})}>
                             <option value="A4">A4 (Cartela de Adesivo)</option>
                             <option value="custom">Personalizado (Rolo / Térmica)</option>
                         </select>
                     </div>
                     <div>
                         <label className="block text-sm font-medium text-slate-600 mb-1">Unidade de Medida (Pers.)</label>
                         <select className="w-full border rounded-lg p-2 text-sm bg-slate-50" value={settings.labelConfig?.unit || 'mm'} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), unit: e.target.value}})}>
                             <option value="cm">Centímetros (cm)</option>
                             <option value="mm">Milímetros (mm)</option>
                         </select>
                     </div>
                 </div>

                 {settings.labelConfig?.paperType === 'custom' && (
                     <div className="grid grid-cols-2 gap-4 bg-orange-50 p-3 rounded-lg border border-orange-100">
                         <div>
                             <label className="block text-xs font-medium text-slate-600 mb-1">Largura da Etiqueta ({settings.labelConfig?.unit || 'mm'})</label>
                             <input type="number" step="0.1" className="w-full border rounded p-2 text-sm" value={settings.labelConfig?.width || 60} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), width: Number(e.target.value)}})} />
                         </div>
                         <div>
                             <label className="block text-xs font-medium text-slate-600 mb-1">Altura da Etiqueta ({settings.labelConfig?.unit || 'mm'})</label>
                             <input type="number" step="0.1" className="w-full border rounded p-2 text-sm" value={settings.labelConfig?.height || 40} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), height: Number(e.target.value)}})} />
                         </div>
                     </div>
                 )}

                 <div className="grid grid-cols-2 gap-4">
                      <div>
                             <label className="block text-sm font-medium text-slate-600 mb-1">Etiquetas por Linha (Colunas)</label>
                             <input type="number" className="w-full border rounded p-2 text-sm" value={settings.labelConfig?.labelsPerRow || 3} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), labelsPerRow: Number(e.target.value)}})} />
                      </div>
                      {settings.labelConfig?.paperType === 'A4' && (
                          <div>
                                 <label className="block text-sm font-medium text-slate-600 mb-1">Linhas por Página</label>
                                 <input type="number" className="w-full border rounded p-2 text-sm" value={settings.labelConfig?.rowsPerPage || 5} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), rowsPerPage: Number(e.target.value)}})} />
                          </div>
                      )}
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                      <div>
                             <label className="block text-sm font-medium text-slate-600 mb-1">Espaço Horizontal ({settings.labelConfig?.unit || 'mm'})</label>
                             <input type="number" step="0.1" className="w-full border rounded p-2 text-sm" value={settings.labelConfig?.gapX || 0} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), gapX: Number(e.target.value)}})} />
                             <p className="text-xs text-slate-400 mt-1">Distância entre as colunas.</p>
                      </div>
                      <div>
                             <label className="block text-sm font-medium text-slate-600 mb-1">Espaço Vertical ({settings.labelConfig?.unit || 'mm'})</label>
                             <input type="number" step="0.1" className="w-full border rounded p-2 text-sm" value={settings.labelConfig?.gapY || 0} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), gapY: Number(e.target.value)}})} />
                             <p className="text-xs text-slate-400 mt-1">Distância entre as linhas.</p>
                      </div>
                 </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                             <label className="block text-sm font-medium text-slate-600 mb-1">Margem Superior ({settings.labelConfig?.unit || 'mm'})</label>
                             <input type="number" step="0.1" className="w-full border rounded p-2 text-sm" value={settings.labelConfig?.marginTop ?? 1} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), marginTop: Number(e.target.value)}})} />
                             <p className="text-[10px] text-slate-400 mt-1">Acima das etiquetas</p>
                      </div>
                      <div>
                             <label className="block text-sm font-medium text-slate-600 mb-1">Margem Inferior ({settings.labelConfig?.unit || 'mm'})</label>
                             <input type="number" step="0.1" className="w-full border rounded p-2 text-sm" value={settings.labelConfig?.marginBottom ?? 1} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), marginBottom: Number(e.target.value)}})} />
                             <p className="text-[10px] text-slate-400 mt-1">Abaixo das etiquetas</p>
                      </div>
                      <div>
                             <label className="block text-sm font-medium text-slate-600 mb-1">Margem Esquerda ({settings.labelConfig?.unit || 'mm'})</label>
                             <input type="number" step="0.1" className="w-full border rounded p-2 text-sm" value={settings.labelConfig?.marginLeft ?? 0.5} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), marginLeft: Number(e.target.value)}})} />
                             <p className="text-[10px] text-slate-400 mt-1">À esquerda da folha</p>
                      </div>
                      <div>
                             <label className="block text-sm font-medium text-slate-600 mb-1">Margem Direita ({settings.labelConfig?.unit || 'mm'})</label>
                             <input type="number" step="0.1" className="w-full border rounded p-2 text-sm" value={settings.labelConfig?.marginRight ?? 0.5} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), marginRight: Number(e.target.value)}})} />
                             <p className="text-[10px] text-slate-400 mt-1">À direita</p>
                      </div>
                 </div>

                 <div className="space-y-2 border-t pt-4">
                     <p className="font-bold text-slate-700 text-sm mb-2">Exibir na Etiqueta</p>
                     
                     <label className="flex items-center gap-2 text-sm cursor-pointer">
                         <input type="checkbox" checked={settings.labelConfig?.showStoreName !== false} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), showStoreName: e.target.checked}})} className="rounded text-blue-500" />
                         Nome da Loja ({settings.name})
                     </label>
                     <label className="flex items-center gap-2 text-sm cursor-pointer">
                         <input type="checkbox" checked={settings.labelConfig?.showProductName !== false} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), showProductName: e.target.checked}})} className="rounded text-blue-500" />
                         Nome do Produto
                     </label>
                     <label className="flex items-center gap-2 text-sm cursor-pointer">
                         <input type="checkbox" checked={settings.labelConfig?.showVariations !== false} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), showVariations: e.target.checked}})} className="rounded text-blue-500" />
                         Variações (Cor, Tamanho, Nº)
                     </label>
                     <label className="flex items-center gap-2 text-sm cursor-pointer">
                         <input type="checkbox" checked={settings.labelConfig?.showBarcode !== false} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), showBarcode: e.target.checked}})} className="rounded text-blue-500" />
                         Código de Barras (Gráfico e Texto)
                     </label>
                     <label className="flex items-center gap-2 text-sm cursor-pointer">
                         <input type="checkbox" checked={settings.labelConfig?.showPrice !== false} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), showPrice: e.target.checked}})} className="rounded text-blue-500" />
                         Preço de Venda
                     </label>
                 </div>
                 
                 <div className="border-t pt-4">
                     <label className="block text-sm font-medium text-slate-600 mb-1">Texto Adicional Livre (Opcional)</label>
                     <input type="text" placeholder="Ex: Produto conferido" className="w-full border rounded p-2 text-sm" value={settings.labelConfig?.customText || ''} onChange={(e) => updateSettings({...settings, labelConfig: {...(settings.labelConfig || {} as any), customText: e.target.value}})} />
                 </div>

                 {/* Order Draggable */}
                 <LabelFieldsOrder settings={settings} updateSettings={updateSettings} />
             </div>
          </SettingsSection>
        )}


        {/* 4. BACKUP E RESTAURAÇÃO - MODIFIED */}
        {isVisible('backupRestore') && (
          <SettingsSection 
            title="Backup e Restauração" 
            icon={Database} 
            isOpen={openSection === 'backup'} 
            onToggle={() => toggleSection('backup')}
          >
            {/* OFFLINE MODE FORCED ALERT */}
            {currentUser?.forceOfflineMode && (
                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg text-sm text-red-800 animate-fade-in shadow-sm">
                    <p className="font-bold flex items-center gap-2 text-red-900"><WifiOff size={18} /> MODO TOTALMENTE OFFLINE ATIVADO</p>
                    <p className="mt-1 text-xs md:text-sm text-red-700">
                        O Administrador bloqueou a Sincronização em Nuvem para sua conta. O sistema está salvando tudo de forma <b>100% Automática</b> no armazenamento local (navegador) a cada adição, edição ou exclusão (Vendas, Produtos, Contas).
                    </p>
                    <p className="mt-2 text-xs font-bold bg-red-100 p-2 rounded inline-block text-red-800 border border-red-200">
                        Nenhum dado financeiro ou de estoque subirá para a nuvem. Recomendamos usar as opções de Backup em Arquivo ou Texto abaixo regularmente.
                    </p>
                </div>
            )}

            {/* CONDITIONAL MESSAGES BASED ON SYNC STATUS */}
            {!currentUser?.forceOfflineMode && settings.cloudSyncEnabled ? (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 animate-fade-in">
                    <p className="font-bold flex items-center gap-2"><Cloud size={16} /> Backup Automático Ativo</p>
                    <p className="mt-1 text-xs md:text-sm">
                        Seus dados já estão salvos automaticamente na nuvem (Firebase).
                        <br/>
                        Desative a <b>Sincronização em Nuvem</b> nas Definições OFF/ON abaixo para realizar um backup manual no dispositivo local.
                    </p>
                </div>
            ) : !currentUser?.forceOfflineMode && (
                <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-800 animate-fade-in">
                    <p className="font-bold flex items-center gap-2"><AlertTriangle size={16} /> Modo Local (Offline)</p>
                    <p className="mt-1 text-xs md:text-sm">
                        Seus dados offline <b>NÃO</b> estão salvos online, mas o <strong className="bg-orange-100 px-1 rounded">Backup Automático Local</strong> está <b>ATIVADO</b> no navegador.
                        <br/>
                        Recomendamos realizar backups manuais (Download ou Texto) regularmente neste dispositivo.
                    </p>
                </div>
            )}

            <p className="text-sm text-slate-500 mb-4">
                Requer confirmação de senha idêntica ao backup para restaurar.
                <br/>
                <span className="text-orange-500 font-bold text-xs">Nota: Mantenha sua senha segura.</span>
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                <button 
                    onClick={handleDownloadBackup} 
                    disabled={isFreeVersion || settings.cloudSyncEnabled} 
                    className={`p-3 rounded-lg flex flex-col items-center justify-center gap-2 border transition-colors ${
                        isFreeVersion || settings.cloudSyncEnabled
                        ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60' 
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 shadow-sm hover:shadow'
                    }`}
                >
                    {isProcessing ? <Loader2 size={24} className="animate-spin" /> : (isFreeVersion ? <Lock size={24} /> : <Download size={24} />)}
                    <span className="font-bold text-xs text-center">Arquivo (.enc)</span>
                </button>
                
                <button 
                    onClick={() => !isProcessing && fileInputRef.current?.click()} 
                    disabled={isProcessing}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-3 rounded-lg flex flex-col items-center justify-center gap-2 border border-slate-300 transition-colors shadow-sm hover:shadow"
                >
                    {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <Upload size={24} />}
                    <span className="font-bold text-xs text-center">Restaurar (.enc)</span>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" accept=".enc" onChange={handleUploadBackup} />

                <button 
                    onClick={() => {
                         if (!showTextBackup) {
                             handleGenerateTextBackup();
                         } else {
                             setShowTextBackup(false);
                         }
                    }} 
                    disabled={isFreeVersion || settings.cloudSyncEnabled} 
                    className={`p-3 rounded-lg flex flex-col items-center justify-center gap-2 border transition-colors ${
                        isFreeVersion || settings.cloudSyncEnabled
                        ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-60' 
                        : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 shadow-sm hover:shadow'
                    }`}
                >
                    {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <FileText size={24} />}
                    <span className="font-bold text-xs text-center">{showTextBackup ? 'Ocultar Texto' : 'Gerar Texto'}</span>
                </button>

                <button 
                    onClick={() => {
                        setShowTextBackup(true);
                        setBackupText(''); // Clear to show restore mode directly if needed
                    }} 
                    disabled={isProcessing}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-3 rounded-lg flex flex-col items-center justify-center gap-2 border border-indigo-200 transition-colors shadow-sm hover:shadow"
                >
                    {isProcessing ? <Loader2 size={24} className="animate-spin" /> : <UploadCloud size={24} />}
                    <span className="font-bold text-xs text-center">Restaurar Texto</span>
                </button>
            </div>

            {showTextBackup && (
                <div className="mt-4 p-4 bg-slate-100 border border-slate-300 rounded-xl animate-fade-in">
                    <h5 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Lock size={16}/> Backup em Texto Criptografado</h5>
                    <p className="text-xs text-slate-600 mb-4">Você pode copiar este texto gigante para enviar por WhatsApp ou salvar no bloco de notas. Para restaurar, basta colar na caixa abaixo.</p>
                    
                    {backupText && (
                        <div className="mb-4">
                            <label className="text-xs font-bold text-indigo-700 mb-1 block">Seu Código de Backup (Copie tudo):</label>
                            <div className="relative">
                                <textarea 
                                    readOnly 
                                    value={backupText} 
                                    className="w-full h-32 p-3 bg-white border border-indigo-200 rounded-lg text-[10px] font-mono text-slate-500 break-all focus:outline-none"
                                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                                />
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(backupText);
                                        alert('Texto copiado com sucesso!');
                                    }}
                                    className="absolute top-2 right-2 bg-indigo-600 text-white p-2 rounded-md hover:bg-indigo-700"
                                >
                                    <Copy size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold text-slate-700 mb-1 block">Restaurar usando Texto Criptografado:</label>
                        <textarea 
                            placeholder="Cole o código do backup aqui..."
                            value={restoreText}
                            onChange={(e) => setRestoreText(e.target.value)}
                            className="w-full h-32 p-3 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-700 mb-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button 
                            onClick={handleRestoreTextBackup}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-colors"
                        >
                            Confirmar Restauração por Texto
                        </button>
                    </div>
                </div>
            )}

            <p className="text-xs text-red-600 font-bold mt-4 text-center bg-red-50 p-2 rounded border border-red-100">
               Para restaurar o backup é necessário alterar a senha para a mesma utilizada quando foi realizado o backup.
            </p>
          </SettingsSection>
        )}


        {/* 5. LICENÇA */}
        {isVisible('license') && (
          <SettingsSection title="Licença" icon={Key} isOpen={openSection === 'license'} onToggle={() => toggleSection('license')}>
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6 rounded-xl relative overflow-hidden mb-6"><div className="relative z-10"><div className="flex items-center gap-2 mb-2"><CheckCircle className="text-green-400" size={20} /><span className="font-bold tracking-wide uppercase text-sm text-slate-300">Status da Conta</span></div><h3 className="text-2xl font-bold mb-1">{getPlanName()}</h3><p className={`text-sm mb-4 font-bold opacity-80`}>{isLifetime ? 'Acesso total liberado' : (timeLeft === 'Expirado' ? 'Renove sua licença' : 'Licença em vigor')}</p><div className="bg-white/10 p-3 rounded-lg border border-white/20 backdrop-blur-sm inline-block"><p className="text-xs text-slate-300 mb-1">{isLifetime ? 'Status da Licença' : 'Tempo Restante'}</p><code className={`font-mono font-bold tracking-widest text-lg ${licenseStatusColor}`}>{timeLeft}</code></div></div></div><div className={`bg-slate-50 border border-slate-200 rounded-xl p-4 transition-opacity ${isLifetime ? 'opacity-50 pointer-events-none' : ''}`}><h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">{isLifetime ? <Lock size={18} className="text-green-600"/> : <Unlock size={18} className="text-blue-600"/>} {isLifetime ? 'Licença Vitalícia Ativada' : 'Ativar Nova Chave'}</h4><div className="flex flex-col sm:flex-row gap-3"><input type="text" value={activationKey} onChange={(e) => setActivationKey(e.target.value)} placeholder={isLifetime ? "Licença vitalícia já ativa" : "Cole sua chave aqui"} disabled={isLifetime} className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500 font-mono uppercase disabled:bg-slate-100"/><button onClick={handleActivateKey} disabled={isLifetime} className={`font-bold py-2 px-6 rounded-lg transition-colors text-sm ${isLifetime ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>Ativar</button></div></div>
        </SettingsSection>
        )}

        {/* 6. PLANOS - UPDATED */}
        {isVisible('plans') && (
          <SettingsSection title="Nossos Planos" icon={CreditCard} isOpen={openSection === 'plans'} onToggle={() => toggleSection('plans')}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayPlans.length === 0 && !isAdmin && (
                    <div className="col-span-full p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
                        Nenhum plano disponível no momento.
                    </div>
                )}
                
                {displayPlans.map(plan => (
                    <div key={plan.key} className={`p-5 rounded-xl border relative overflow-hidden flex flex-col h-full transition-transform hover:scale-[1.02] ${plan.color} ${!plan.isVisible && isAdmin ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                        
                        {/* ADMIN CONTROLS HEADER */}
                        {isAdmin && (
                            <div className="absolute top-0 right-0 p-2 flex gap-2 z-20">
                                <button 
                                    onClick={() => updatePlanConfig(plan.key!, { isVisible: !plan.isVisible })}
                                    className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors ${plan.isVisible ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}
                                >
                                    {plan.isVisible ? <Eye size={14}/> : <EyeOff size={14}/>}
                                    {plan.isVisible ? 'Visível' : 'Oculto'}
                                </button>
                            </div>
                        )}

                        {!isAdmin && plan.isOnline && (
                            <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                                <Zap size={10} fill="currentColor" /> Recomendado
                            </div>
                        )}

                        <div className="mb-4 pt-4">
                            <h4 className="font-bold text-slate-800 text-lg">{plan.name}</h4>
                            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide flex items-center gap-1 mt-1">
                                {plan.isOnline ? <Wifi size={12} className="text-green-600"/> : <WifiOff size={12} className="text-slate-400"/>}{plan.type}
                            </p>
                        </div>

                        {/* PRICE EDITING */}
                        <div className="flex items-baseline gap-1 mb-2">
                            {isAdmin ? (
                                <div className="flex items-center gap-1 bg-white/50 p-1 rounded border border-slate-200 w-full max-w-[150px]">
                                    <input 
                                        className="text-2xl font-bold text-slate-900 w-full bg-transparent outline-none"
                                        value={plan.price}
                                        onChange={(e) => updatePlanConfig(plan.key!, { price: e.target.value })}
                                    />
                                </div>
                            ) : (
                                <span className="text-2xl font-bold text-slate-900">{plan.price}</span>
                            )}
                            <span className="text-sm text-slate-500">{plan.period}</span>
                        </div>

                        <p className="text-xs text-slate-500 mb-4 h-8">{plan.description}</p>

                        {/* FEATURES LIST EDITING */}
                        <div className="space-y-2 mb-6 flex-1">
                            {plan.features?.map((feat: string, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 text-sm text-slate-700 group/feat">
                                    <Check size={14} className="text-green-500 shrink-0" />
                                    {isAdmin ? (
                                        <div className="flex-1 flex gap-2">
                                            <input 
                                                className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 outline-none text-xs font-medium"
                                                value={feat}
                                                onChange={(e) => updatePlanFeature(plan.key!, idx, e.target.value)}
                                            />
                                            <button 
                                                onClick={() => removePlanFeature(plan.key!, idx)}
                                                className="opacity-0 group-hover/feat:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="text-xs font-medium">{feat}</span>
                                    )}
                                </div>
                            ))}
                            
                            {isAdmin && (
                                <button 
                                    onClick={() => addPlanFeature(plan.key!)}
                                    className="text-xs text-blue-600 font-bold flex items-center gap-1 mt-2 hover:bg-blue-50 px-2 py-1 rounded w-fit transition-colors"
                                >
                                    <Plus size={12} /> Adicionar Benefício
                                </button>
                            )}
                        </div>

                        <a 
                            href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá, gostaria de assinar o plano ${plan.name} por ${plan.price}.`)}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={`w-full py-3 rounded-lg font-bold text-white text-sm flex items-center justify-center gap-2 transition-all shadow-md mt-auto ${plan.btnColor}`}
                        >
                            Assinar Agora
                        </a>
                    </div>
                ))}
            </div>
        </SettingsSection>
        )}

        {/* 7. SUPORTE */}
        {isVisible('support') && (
          <SettingsSection title="Suporte" icon={HelpCircle} isOpen={openSection === 'support'} onToggle={() => toggleSection('support')}>
            <div className="flex flex-col gap-6"><div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center"><p className="text-sm text-blue-800 font-medium">Precisando de ajuda? Fale com nosso especialista.</p></div><div className="flex flex-col md:flex-row items-center gap-6"><div className="shrink-0 relative group"><div className="w-32 h-32 rounded-xl border border-slate-100 shadow-sm overflow-hidden bg-white relative flex items-center justify-center p-2"><img src={imageUrl} alt="Suporte Técnico" className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" onError={(e) => { e.currentTarget.src = "https://ui-avatars.com/api/?name=Suporte+Tecnico&background=0D8ABC&color=fff&size=256"; }} /></div><div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse"></div></div><div className="text-center md:text-left space-y-2 flex-1 w-full"><h3 className="text-xl font-bold text-slate-800">Maicon Coutinho dos Santos</h3><p className="text-accent font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] inline-block uppercase tracking-wider">Suporte Especializado</p><div className="flex flex-col gap-2 text-slate-600 w-full mt-2"><div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-sm"><Phone size={16} className="text-slate-400" /><span className="font-mono">41 98819 2359</span></div><div className="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 text-sm"><Mail size={16} className="text-slate-400" /><span>mcn.coutinho@gmail.com</span></div></div></div></div><a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" className="group relative w-full flex items-center justify-center gap-3 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold text-base shadow-lg hover:shadow-green-500/30 transition-all transform hover:-translate-y-1 overflow-hidden"><div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12"></div><MessageCircle size={20} className="animate-bounce" /><span>Suporte WhatsApp</span></a></div>
          </SettingsSection>
        )}
      </div>

      {/* CONFIRM RESTORE PASSWORD MODAL */}
      {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                  <div className="p-6 text-center">
                      <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4"><Lock size={32} /></div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Segurança do Backup</h3>
                      <p className="text-slate-500 text-sm mb-4">Confirme sua senha atual para verificar a propriedade deste backup.</p>
                      <div className="mb-4"><input type="password" className="w-full text-center border-2 border-slate-200 rounded-lg p-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-bold text-slate-700" placeholder="Sua senha..." autoFocus value={restorePassword} onChange={(e) => setRestorePassword(e.target.value)} /></div>
                      <div className="flex flex-col gap-3"><button onClick={confirmRestoreWithPassword} disabled={isProcessing} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg">{isProcessing && <Loader2 size={18} className="animate-spin"/>}{isProcessing ? 'Verificando...' : 'Confirmar Restauração'}</button><button onClick={() => { setShowPasswordModal(false); setPendingBackupContent(null); }} disabled={isProcessing} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-lg font-medium transition-colors">Cancelar</button></div>
                  </div>
              </div>
          </div>
      )}

      {/* SYNC CONFLICT MODAL (NEW) */}
      {showSyncConflictModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden relative">
                  <div className="p-6">
                      <div className="flex flex-col items-center text-center mb-6">
                          <div className="w-16 h-16 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-4 border border-orange-200 shadow-sm animate-pulse">
                              <RefreshCw size={32} />
                          </div>
                          <h3 className="text-xl font-bold text-slate-800 mb-2">Conflito de Sincronização</h3>
                          <p className="text-sm text-slate-500 leading-relaxed">
                              Detectamos dados locais neste dispositivo. O que você deseja fazer ao ativar a nuvem?
                          </p>
                      </div>

                      <div className="space-y-4">
                          <button 
                              onClick={handleRestoreFromCloud}
                              className="w-full bg-white border-2 border-blue-100 hover:border-blue-500 hover:bg-blue-50 p-4 rounded-xl flex items-center gap-4 transition-all group text-left relative overflow-hidden"
                          >
                              <div className="bg-blue-100 p-2 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                                  <Cloud size={24} />
                              </div>
                              <div>
                                  <span className="font-bold text-slate-800 block text-sm group-hover:text-blue-700">Restaurar backup da nuvem</span>
                                  <span className="text-xs text-slate-500">Apaga dados locais e baixa da nuvem.</span>
                              </div>
                          </button>

                          <button 
                              onClick={handleOverwriteCloud}
                              disabled={isProcessing}
                              className="w-full bg-white border-2 border-green-100 hover:border-green-500 hover:bg-green-50 p-4 rounded-xl flex items-center gap-4 transition-all group text-left relative overflow-hidden"
                          >
                              <div className="bg-green-100 p-2 rounded-full text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors shrink-0">
                                  {isProcessing ? <Loader2 className="animate-spin" size={24}/> : <Upload size={24} />}
                              </div>
                              <div>
                                  <span className="font-bold text-slate-800 block text-sm group-hover:text-green-700">Salvar dados atuais na nuvem</span>
                                  <span className="text-xs text-slate-500">Substitui o que está na nuvem por este dispositivo.</span>
                              </div>
                          </button>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                          <button 
                              onClick={() => setShowSyncConflictModal(false)}
                              className="text-slate-400 hover:text-slate-600 text-sm font-medium"
                          >
                              Cancelar Ativação
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Confirmation Modal Render */}
      {confirmConfig && (
          <ConfirmModal 
              isOpen={confirmConfig.isOpen}
              onClose={() => setConfirmConfig(null)}
              onConfirm={confirmConfig.onConfirm}
              title={confirmConfig.title}
              message={confirmConfig.message}
              isDangerous={confirmConfig.isDangerous}
              confirmText={confirmConfig.confirmText || "Confirmar"}
          />
      )}

      {/* VARIATION DELETE MODAL */}
      {showVariationDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="p-6">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Trash2 size={20} className="text-red-500"/> Excluir Variação</h3>
                 <button onClick={() => { setShowVariationDeleteModal(false); setVariationDeleteType(null); }} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
               </div>
               
               {!variationDeleteType ? (
                  <div className="space-y-3">
                     <p className="text-sm text-slate-600 mb-2">Selecione qual tipo de variação deseja excluir:</p>
                     <button onClick={() => setVariationDeleteType('size')} className="w-full text-left p-3 border rounded-lg hover:bg-slate-50 flex items-center justify-between">Tamanhos <ChevronRight size={16} className="text-slate-400"/></button>
                     <button onClick={() => setVariationDeleteType('color')} className="w-full text-left p-3 border rounded-lg hover:bg-slate-50 flex items-center justify-between">Cores <ChevronRight size={16} className="text-slate-400"/></button>
                     <button onClick={() => setVariationDeleteType('number')} className="w-full text-left p-3 border rounded-lg hover:bg-slate-50 flex items-center justify-between">Números <ChevronRight size={16} className="text-slate-400"/></button>
                  </div>
               ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                       <button onClick={() => setVariationDeleteType(null)} className="text-slate-400 hover:text-slate-600 p-1"><ChevronLeft size={16}/></button>
                       <h4 className="font-bold text-slate-700">
                           {variationDeleteType === 'size' ? 'Excluir Tamanho' : variationDeleteType === 'color' ? 'Excluir Cor' : 'Excluir Número'}
                       </h4>
                    </div>
                    
                    <div className="max-h-60 overflow-y-auto pr-1 space-y-2">
                       {variationDeleteType === 'size' && (!settings.vitrineConfig?.availableSizes || settings.vitrineConfig.availableSizes.length === 0) && <p className="text-sm text-slate-500 text-center py-4">Nenhum tamanho cadastrado.</p>}
                       {variationDeleteType === 'size' && settings.vitrineConfig?.availableSizes?.map(size => (
                           <div key={size} className="flex justify-between items-center p-2 border rounded-lg bg-slate-50">
                               <span className="text-sm font-medium">{size}</span>
                               <button 
                                  onClick={() => {
                                      const newSizes = settings.vitrineConfig!.availableSizes!.filter(s => s !== size);
                                      updateSettings({...settings, vitrineConfig: {...(settings.vitrineConfig || {}), availableSizes: newSizes}});
                                  }}
                                  className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                               ><Trash2 size={16}/></button>
                           </div>
                       ))}
                       
                       {variationDeleteType === 'color' && (!settings.vitrineConfig?.availableColors || settings.vitrineConfig.availableColors.length === 0) && <p className="text-sm text-slate-500 text-center py-4">Nenhuma cor cadastrada.</p>}
                       {variationDeleteType === 'color' && settings.vitrineConfig?.availableColors?.map(color => (
                           <div key={color} className="flex justify-between items-center p-2 border rounded-lg bg-slate-50">
                               <span className="text-sm font-medium">{color}</span>
                               <button 
                                  onClick={() => {
                                      const newColors = settings.vitrineConfig!.availableColors!.filter(c => c !== color);
                                      updateSettings({...settings, vitrineConfig: {...(settings.vitrineConfig || {}), availableColors: newColors}});
                                  }}
                                  className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                               ><Trash2 size={16}/></button>
                           </div>
                       ))}
                       
                       {variationDeleteType === 'number' && (!settings.vitrineConfig?.availableNumbers || settings.vitrineConfig.availableNumbers.length === 0) && <p className="text-sm text-slate-500 text-center py-4">Nenhum número cadastrado.</p>}
                       {variationDeleteType === 'number' && settings.vitrineConfig?.availableNumbers?.map(num => (
                           <div key={num} className="flex justify-between items-center p-2 border rounded-lg bg-slate-50">
                               <span className="text-sm font-medium">{num}</span>
                               <button 
                                  onClick={() => {
                                      const newNums = settings.vitrineConfig!.availableNumbers!.filter(n => n !== num);
                                      updateSettings({...settings, vitrineConfig: {...(settings.vitrineConfig || {}), availableNumbers: newNums}});
                                  }}
                                  className="text-red-500 hover:bg-red-50 p-1.5 rounded"
                               ><Trash2 size={16}/></button>
                           </div>
                       ))}
                    </div>
                  </div>
               )}
            </div>
          </div>
        </div>
      )}

      {/* DELETE DATA MODAL */}
      {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                  <div className="p-6">
                      <div className="flex flex-col items-center mb-4 text-center">
                          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
                              <Trash2 size={32} />
                          </div>
                          <h3 className="text-xl font-bold text-slate-800">Excluir Dados Antigos</h3>
                          <p className="text-sm text-slate-500 mt-2">Esta ação apagará <b>imediatamente</b> e <b>permanentemente</b> os registros com data anterior ao período selecionado.</p>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 space-y-2"><p className="text-xs font-bold text-slate-500 uppercase mb-2">Selecione o que excluir:</p><label className="flex items-center gap-3 cursor-pointer p-2 hover:bg-white rounded border border-transparent hover:border-slate-200 transition-colors"><input type="checkbox" className="w-5 h-5 accent-red-600 rounded" checked={deleteOptions.all} onChange={() => setDeleteOptions(prev => ({ all: !prev.all, revenues: !prev.all, payables: !prev.all, sales: !prev.all }))} /><span className="font-bold text-slate-700">Todos os Dados</span></label><div className={`space-y-2 pl-4 transition-opacity ${deleteOptions.all ? 'opacity-50 pointer-events-none' : ''}`}><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-red-600" checked={deleteOptions.revenues} onChange={() => setDeleteOptions(p => ({...p, revenues: !p.revenues}))} /><span className="text-sm text-slate-600">Apenas Receitas</span></label><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-red-600" checked={deleteOptions.payables} onChange={() => setDeleteOptions(p => ({...p, payables: !p.payables}))} /><span className="text-sm text-slate-600">Apenas Despesas</span></label><label className="flex items-center gap-3 cursor-pointer"><input type="checkbox" className="w-4 h-4 accent-red-600" checked={deleteOptions.sales} onChange={() => setDeleteOptions(p => ({...p, sales: !p.sales}))} /><span className="text-sm text-slate-600">Planos e Vendas</span></label></div></div>
                      <div className="flex flex-col gap-3"><button onClick={handleExecuteDelete} disabled={isProcessing} className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 shadow-lg">{isProcessing ? <Loader2 size={18} className="animate-spin"/> : <Trash2 size={18} />}{isProcessing ? 'Excluindo...' : 'CONFIRMAR EXCLUSÃO'}</button><button onClick={() => setShowDeleteModal(false)} disabled={isProcessing} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-lg font-medium transition-colors">Cancelar</button></div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

// Sub-component for ordering fields via Drag and Drop
const LabelFieldsOrder = ({ settings, updateSettings }: { settings: CompanySettings, updateSettings: (s: CompanySettings) => void }) => {
    const defaultOrder: ('storeName' | 'productName' | 'variations' | 'barcode' | 'price' | 'customText')[] = ['storeName', 'productName', 'variations', 'barcode', 'price', 'customText'];
    const currentOrder = settings.labelConfig?.fieldOrder || defaultOrder;

    const [draggedIdx, setDraggedIdx] = React.useState<number | null>(null);

    const handleDragStart = (e: React.DragEvent, idx: number) => {
        setDraggedIdx(idx);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetIdx: number) => {
        e.preventDefault();
        if (draggedIdx === null || draggedIdx === targetIdx) return;
        
        const newOrder = [...currentOrder];
        const item = newOrder.splice(draggedIdx, 1)[0];
        newOrder.splice(targetIdx, 0, item);
        
        updateSettings({
            ...settings, 
            labelConfig: {
                ...(settings.labelConfig || {} as any),
                fieldOrder: newOrder
            }
        });
        setDraggedIdx(null);
    };
    
    // Labels mapping for display
    const fieldLabels: Record<string, string> = {
        storeName: 'Nome da Loja',
        productName: 'Nome do Produto',
        variations: 'Variações',
        barcode: 'Código de Barras',
        price: 'Preço de Venda',
        customText: 'Texto Adicional'
    };

    return (
        <div className="border-t pt-4 mt-4 space-y-2">
            <p className="font-bold text-slate-700 text-sm mb-2">Ordenação dos Itens (Arraste para organizar)</p>
            <div className="flex flex-col gap-2">
                {currentOrder.map((field, idx) => (
                    <div 
                        key={field}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e)}
                        onDrop={(e) => handleDrop(e, idx)}
                        onDragEnd={() => setDraggedIdx(null)}
                        className={`flex items-center gap-3 bg-white border rounded-lg p-3 shadow-sm cursor-move hover:border-blue-300 hover:shadow transition-all ${draggedIdx === idx ? 'opacity-50 scale-95' : ''}`}
                    >
                        <GripVertical size={18} className="text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">{fieldLabels[field]}</span>
                    </div>
                ))}
            </div>
            <p className="text-xs text-slate-400 mt-2 text-center">A ordem acima define a posição de cada elemento na etiqueta impressa.</p>
        </div>
    );
};
