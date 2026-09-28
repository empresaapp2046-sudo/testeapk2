// @ts-nocheck
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { User, UserRole, UserPermissions } from '../types';
import { Plus, Trash2, Edit2, Save, X, Settings2, ChevronDown, ChevronRight, Wallet } from 'lucide-react';
import { useNavigate } from '../lib/router-compat';

const mainPermissions = [
    { key: 'canAccessPOS', label: 'PDV / Vendas' },
    { key: 'canAccessInventory', label: 'Estoque & Produtos' },
    { key: 'canAccessCustomers', label: 'Clientes' },
    { key: 'canAccessFinanceiro', label: 'Financeiro' },
    { key: 'canAccessReports', label: 'Relatórios' },
    { key: 'canAccessMessages', label: 'Mensagens' },
    { key: 'canAccessRaffles', label: 'Sorteios' },
    { key: 'canManageUsers', label: 'Gerenciar Funcionários' },
    { key: 'visibility', label: 'Acesso a Configurações' },
    { key: 'dashboardVisual', label: 'Visão Geral / Dashboard' }
];

const subPermissionsConfig: Record<string, { key: keyof UserPermissions, label: string }[]> = {
    canAccessInventory: [
        { key: 'inventoryProductsView', label: 'Produtos' },
        { key: 'inventoryPlansView', label: 'Planos' },
        { key: 'inventoryBrandsView', label: 'Marcas' },
        { key: 'inventorySuppliersView', label: 'Fornecedores' },
        { key: 'inventoryVitrineView', label: 'Gestão Vitrine' },
    ],
    canAccessFinanceiro: [
        { key: 'financeiroOverview', label: 'Visão Geral' },
        { key: 'financeiroRevenues', label: 'Receitas' },
        { key: 'financeiroPlans', label: 'Planos' },
        { key: 'financeiroExpenses', label: 'Despesas' },
    ],
    canAccessReports: [
        { key: 'canAccessReportsCash', label: 'Relatórios de Caixa' },
        { key: 'canAccessReportsCorporate', label: 'Relatórios Empresariais' },
        { key: 'canAccessReportsAI', label: 'Relatórios & IA' },
        { key: 'cloudSync', label: 'Sincronização Nuvem' },
        { key: 'plans', label: 'Acesso a Planos' },
    ],
    visibility: [
        { key: 'companyData', label: 'Dados da Empresa' },
        { key: 'userData', label: 'Dados do Usuário' },
        { key: 'dataRetention', label: 'Retenção de Dados' },
        { key: 'sidebarConfig', label: 'Menu Lateral' },
        { key: 'printerConfig', label: 'Impressora' },
        { key: 'posConfig', label: 'PDV' },
        { key: 'backupRestore', label: 'Backup e Restauração' },
        { key: 'cloudSync', label: 'Sincronização em Nuvem' },
        { key: 'license', label: 'Licença' },
        { key: 'plans', label: 'Planos' },
        { key: 'support', label: 'Suporte' },
        { key: 'notifications', label: 'Notificações' },
    ],
    dashboardVisual: [
        { key: 'dashboardVitrine', label: 'Vitrine Virtual' },
        { key: 'dashboardVendas', label: 'Vendas' },
        { key: 'dashboardAReceber', label: 'A Receber' },
        { key: 'dashboardAPagar', label: 'A Pagar (Cards)' },
        { key: 'dashboardAlertas', label: 'Alertas' },
        { key: 'dashboardEstoqueBaixo', label: 'Estoque Baixo' },
        { key: 'dashboardAniversariantes', label: 'Aniversariantes' },
        { key: 'dashboardProximosPagamentos', label: 'Contas a Pagar / Próximos (Lista)' },
    ]
};

const editDeleteOptions = [
    { label: 'Produtos', editKey: 'inventoryProductsEdit', deleteKey: 'inventoryProductsDelete' },
    { label: 'Planos', editKey: 'inventoryPlansEdit', deleteKey: 'inventoryPlansDelete' },
    { label: 'Marcas', editKey: 'inventoryBrandsEdit', deleteKey: 'inventoryBrandsDelete' },
    { label: 'Fornecedores', editKey: 'inventorySuppliersEdit', deleteKey: 'inventorySuppliersDelete' },
    { label: 'Gestão Vitrine', editKey: 'inventoryVitrineEdit', deleteKey: 'inventoryVitrineDelete' },
    { label: 'Clientes', editKey: 'customersEdit', deleteKey: 'customersDelete' },
    { label: 'Funcionários', editKey: 'usersEdit', deleteKey: 'usersDelete' },
    { label: 'Contas a Pagar (Financeiro)', editKey: 'financeiroEdit', deleteKey: 'financeiroDelete' },
    { label: 'Mensagens', editKey: 'messagesEdit', deleteKey: 'messagesDelete' }
];

export const EmployeeManagement: React.FC = () => {
    const { users, createEmployee, updateEmployee, adminDeleteUser, currentUser } = useStore();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditDeleteModalOpen, setIsEditDeleteModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<User | null>(null);
    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
    
    const [formData, setFormData] = useState({ 
        name: '', 
        username: '',
        email: '', 
        password: '', 
        role: 'Vendedor' as UserRole, 
        forcedCashOpening: false,
        permissions: { 
            canAccessPOS: true, 
            canAccessInventory: false, 
            inventoryProductsView: false,
            inventoryPlansView: false,
            inventoryBrandsView: false,
            inventorySuppliersView: false,
            inventoryVitrineView: false,
            canAccessCustomers: false, 
            canAccessFinanceiro: false, 
            canAccessReports: false, 
            canAccessMessages: true, 
            canAccessRaffles: false,
            canManageUsers: false,
            visibility: true,
            companyData: false,
            userData: false,
            dataRetention: false,
            dashboardVisual: false,
            sidebarConfig: false,
            printerConfig: false,
            posConfig: false,
            backupRestore: false,
            cloudSync: false,
            license: false,
            plans: false,
            support: false,
            notifications: false
        } as UserPermissions
    });

    const tenantIdToUse = currentUser?.tenantId || currentUser?.id;
    const employees = users.filter(u => (u.tenantId === tenantIdToUse || u.ownerId === tenantIdToUse) && u.id !== currentUser?.id && u.role !== 'DonoLoja');

    const handleCreateOrUpdate = async () => {
        if (!formData.name || !formData.email || !formData.role) { alert("Preencha os campos obrigatórios: Nome, Email e Cargo."); return; }
        if (!editingEmployee && !formData.username) { alert("Preencha o Nome de Usuário."); return; }
        if (editingEmployee) {
            const res = await updateEmployee(editingEmployee.id, formData); if(res && !res.success) { alert(res.message); return; }
        } else {
            const res = await createEmployee(formData); if(res && !res.success) { alert(res.message); return; }
        }
        setIsModalOpen(false);
        setEditingEmployee(null);
    };

    const handleEdit = (emp: User) => {
        setEditingEmployee(emp);
        setFormData({
            name: emp.name || '',
            username: emp.username || '',
            email: emp.email || '',
            password: '', 
            role: emp.role,
            forcedCashOpening: !!emp.forcedCashOpening,
            permissions: { ...formData.permissions, ...emp.permissions }
        });
        setIsModalOpen(true);
    };

    const toggleSection = (key: string) => {
        setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const togglePermission = (key: keyof UserPermissions, checked: boolean) => {
        const newPermissions = { ...formData.permissions, [key]: checked };
        
        // Auto-expand and enable all sub-permissions if checking a main section
        if (checked && subPermissionsConfig[key]) {
            setExpandedSections(prev => ({ ...prev, [key]: true }));
            subPermissionsConfig[key].forEach(sub => {
                (newPermissions as any)[sub.key] = true;
            });
        }
        
        setFormData({ ...formData, permissions: newPermissions as UserPermissions });
    };

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Gerenciar Funcionários</h1>
            <button onClick={() => { 
                setFormData({ name: '', username: '', email: '', password: '', role: "Vendedor" as UserRole, forcedCashOpening: false, permissions: { canAccessPOS: true, canAccessInventory: false, inventoryProductsView: false, inventoryPlansView: false, inventoryBrandsView: false, inventorySuppliersView: false, inventoryVitrineView: false, canAccessCustomers: false, canAccessFinanceiro: false, financeiroOverview: false, financeiroRevenues: false, financeiroPlans: false, financeiroExpenses: false, canAccessReports: false, canAccessReportsCash: false, canAccessReportsCorporate: false, canAccessReportsAI: false, canAccessMessages: true, canAccessRaffles: false, canManageUsers: false, visibility: true, companyData: false, userData: false, dataRetention: false, dashboardVisual: false, sidebarConfig: false, printerConfig: false, posConfig: false, backupRestore: false, cloudSync: false, license: false, plans: false, support: false, notifications: false } });
                setEditingEmployee(null);
                setIsModalOpen(true);
            }} className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 mb-4">
                <Plus size={20} /> Novo Funcionário
            </button>
            <div className="bg-white p-4 rounded shadow">
                <table className="w-full">
                    <thead>
                        <tr>
                            <th className="text-left p-2 border-b">Nome</th>
                            <th className="text-left p-2 border-b">Email</th>
                            <th className="text-left p-2 border-b">Cargo</th>
                            <th className="text-left p-2 border-b">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
                        {employees.map(emp => (
                            <tr key={emp.id} className="border-b last:border-0">
                                <td className="p-2">{emp.name || emp.username}</td>
                                <td className="p-2">{emp.email}</td>
                                <td className="p-2">{emp.role}</td>
                                <td className="p-2">
                                    <button 
                                        onClick={() => navigate('/cash-reports', { state: { selectedUserId: emp.id } })} 
                                        className="text-emerald-600 mr-2 p-1 hover:bg-emerald-50 rounded" 
                                        title="Ver Caixas do Funcionário"
                                    >
                                        <Wallet size={18}/>
                                    </button>
                                    <button onClick={() => handleEdit(emp)} className="text-blue-600 mr-2 p-1 hover:bg-blue-50 rounded"><Edit2 size={18}/></button>
                                    <button onClick={() => {
                                        if (window.confirm("Tem certeza que deseja excluir este funcionário?")) {
                                            adminDeleteUser(emp.id);
                                        }
                                    }} className="text-red-600 p-1 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-40">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex-shrink-0 flex justify-between items-center">
                            <h2 className="text-xl font-bold">{editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}</h2>
                            <button onClick={() => { setIsModalOpen(false); setEditingEmployee(null); }} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700">Nome Completo</label>
                                <input type="text" placeholder="Nome" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700">Nome de Usuário (Login)</label>
                                <input type="text" placeholder="Nome de Usuário" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700">Email</label>
                                <input type="email" placeholder="Email" className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                            </div>
                            {!editingEmployee && (
                                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <label className="block text-sm font-semibold text-blue-800 mb-1">Senha do Funcionário (Opcional)</label>
                                    <input type="password" placeholder="Digite uma senha ou deixe em branco" className="w-full p-2 border rounded border-blue-200 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                                    <p className="text-xs text-blue-600 mt-2">Se você deixar em branco, o funcionário será solicitado a criar uma senha no primeiro login.</p>
                                </div>
                            )}
                            <div>
                                <label className="block text-sm font-medium mb-1 text-slate-700">Cargo</label>
                                <select className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}>
                                    <option value="Vendedor">Vendedor</option>
                                    <option value="SubGerente">Sub-Gerente</option>
                                </select>
                            </div>
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" checked={!!(formData as any).forcedCashOpening} onChange={e => setFormData({...formData, forcedCashOpening: e.target.checked})} />
                                    <span className="text-sm font-medium text-slate-700">Obrigar Abertura de Caixa</span>
                                </label>
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-slate-800">Permissões de Acesso</h3>
                                    <button onClick={() => setIsEditDeleteModalOpen(true)} className="flex items-center gap-1 text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full font-semibold hover:bg-indigo-200 transition-colors">
                                        <Settings2 size={14} /> Editar / Excluir
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {mainPermissions.map(main => {
                                        const hasSub = !!subPermissionsConfig[main.key];
                                        const isExpanded = expandedSections[main.key];
                                        return (
                                            <div key={main.key} className="border rounded-lg bg-gray-50 overflow-hidden">
                                                <div className="flex items-center justify-between p-3 hover:bg-gray-100">
                                                    <label className="flex items-center gap-3 cursor-pointer flex-1">
                                                        <input 
                                                            type="checkbox" 
                                                            className="rounded w-4 h-4 text-blue-600 focus:ring-blue-500"
                                                            checked={!!formData.permissions[main.key as keyof UserPermissions]} 
                                                            onChange={e => togglePermission(main.key as keyof UserPermissions, e.target.checked)} 
                                                        />
                                                        <span className="font-medium text-sm text-slate-700 select-none">{main.label}</span>
                                                    </label>
                                                    {hasSub && formData.permissions[main.key as keyof UserPermissions] && (
                                                        <button onClick={() => toggleSection(main.key)} className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-200">
                                                            {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                                        </button>
                                                    )}
                                                </div>
                                                {hasSub && isExpanded && formData.permissions[main.key as keyof UserPermissions] && (
                                                    <div className="px-4 py-2 pb-3 bg-white border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                        {subPermissionsConfig[main.key].map(sub => (
                                                            <label key={sub.key} className="flex items-center gap-2 cursor-pointer text-sm">
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="rounded text-blue-600 focus:ring-blue-500"
                                                                    checked={!!formData.permissions[sub.key as keyof UserPermissions]} 
                                                                    onChange={e => setFormData({
                                                                        ...formData, 
                                                                        permissions: { ...formData.permissions, [sub.key]: e.target.checked }
                                                                    })} 
                                                                />
                                                                <span className="text-slate-600 truncate">{sub.label}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
                            <button onClick={() => { setIsModalOpen(false); setEditingEmployee(null); }} className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors">Cancelar</button>
                            <button onClick={handleCreateOrUpdate} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2">
                                <Save size={18} /> Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isEditDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800"><Settings2 size={24} className="text-indigo-600"/> Permissões de Edição e Exclusão</h2>
                                <p className="text-sm text-slate-500 mt-1">Defina o que o funcionário pode editar ou excluir no sistema.</p>
                            </div>
                            <button onClick={() => setIsEditDeleteModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6 bg-white">
                            <div className="grid grid-cols-2 gap-6">
                                {/* Coluna Editar */}
                                <div>
                                    <h3 className="font-bold text-lg mb-4 text-blue-700 border-b pb-2">Opções para Editar</h3>
                                    <div className="space-y-3">
                                        {editDeleteOptions.map(opt => (
                                            <label key={`edit-${opt.editKey}`} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-50 transition-colors">
                                                <input 
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                                                    checked={!!formData.permissions[opt.editKey as keyof UserPermissions]}
                                                    onChange={e => setFormData({
                                                        ...formData, 
                                                        permissions: { ...formData.permissions, [opt.editKey]: e.target.checked }
                                                    })}
                                                />
                                                <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                
                                {/* Coluna Excluir */}
                                <div>
                                    <h3 className="font-bold text-lg mb-4 text-red-600 border-b pb-2">Opções para Excluir</h3>
                                    <div className="space-y-3">
                                        {editDeleteOptions.map(opt => (
                                            <label key={`delete-${opt.deleteKey}`} className="flex items-center gap-3 cursor-pointer p-2 rounded hover:bg-slate-50 transition-colors">
                                                <input 
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded text-red-500 focus:ring-red-500"
                                                    checked={!!formData.permissions[opt.deleteKey as keyof UserPermissions]}
                                                    onChange={e => setFormData({
                                                        ...formData, 
                                                        permissions: { ...formData.permissions, [opt.deleteKey]: e.target.checked }
                                                    })}
                                                />
                                                <span className="text-sm font-medium text-slate-700">{opt.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button onClick={() => setIsEditDeleteModalOpen(false)} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-indigo-700 shadow-sm transition-colors">
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
