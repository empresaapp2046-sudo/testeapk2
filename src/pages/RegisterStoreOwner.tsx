// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { useNavigate, useSearch, Link } from '@tanstack/react-router';
import { User, Lock, Mail, Store, Phone, MapPin, Search, ArrowRight, Loader2, AlertTriangle, UserPlus, XCircle } from 'lucide-react';


export const RegisterStoreOwner = () => {
    const { publicRegisterStoreOwner, validateInviteLink } = useStore();
    const navigate = useNavigate();
    const search = useSearch({ from: '/register-store-owner' });
    const token = search.token;

    
    const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
    const [checkingToken, setCheckingToken] = useState(true);

    useEffect(() => {
        const verifyToken = async () => {
            if (!token) {
                setIsTokenValid(false);
                setCheckingToken(false);
                return;
            }
            const valid = await validateInviteLink(token);
            setIsTokenValid(valid);
            setCheckingToken(false);
        };
        verifyToken();
    }, [token, validateInviteLink]);
    
    const [form, setForm] = useState({
        companyName: '',
        name: '',
        username: '',
        email: '',
        password: '',
        phone: '',
        address: ''
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!form.username || !form.password || !form.name) {
            setError('Preencha os campos obrigatórios (Nome, Usuário e Senha).');
            return;
        }

        setLoading(true);
        setError('');
        
        try {
            const result = await publicRegisterStoreOwner(form, token || undefined);
            
            if (result.success) {
                setSuccess(true);
                setTimeout(() => {
                    const slug = result.user?.slug || result.user?.username || 'dashboard';
                    window.location.href = `/${slug}/dashboard`;
                }, 2000);
            } else {
                setError(result.message);
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao criar conta');
        } finally {
            setLoading(false);
        }
    };

    if (checkingToken) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
                <Loader2 className="animate-spin text-white" size={48} />
            </div>
        );
    }

    if (!isTokenValid) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center relative z-10">
                    <XCircle size={48} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Negado</h2>
                    <p className="text-slate-600 mb-6">Este link de cadastro é inválido ou já expirou. Solicite um novo link ao administrador do sistema.</p>
                    <button onClick={() => navigate({ to: '/login' })} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-700">
                        Voltar para Login
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-white text-center">
                        <div className="w-16 h-16 bg-white text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Store size={32} />
                        </div>
                        <h2 className="text-3xl font-bold mb-1">Conta Criada!</h2>
                    </div>
                    <div className="p-8 text-center text-slate-600">
                        Sua loja foi cadastrada com sucesso. O período de teste de 12 horas foi iniciado. Redirecionando para o painel...
                    </div>

                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] bg-[radial-gradient(circle,_rgba(59,130,246,0.1)_0%,_transparent_50%)] animate-spin-slow"></div>
            </div>

            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8 text-white text-center">
                    <h2 className="text-3xl font-bold mb-1">Smart PDV PRO</h2>
                    <p className="text-blue-100 text-sm">Cadastro de Lojista</p>
                </div>

                <div className="p-8">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 text-center">
                        Crie sua Conta
                    </h3>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-fade-in">
                            <AlertTriangle size={16} /> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="relative">
                            <User className="absolute left-3 top-3 text-slate-400" size={20} />
                            <input type="text" placeholder="Nome Completo *" className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} />
                        </div>
                        <div className="relative">
                            <Store className="absolute left-3 top-3 text-slate-400" size={20} />
                            <input type="text" placeholder="Nome da Empresa" className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={form.companyName} onChange={(e) => setForm({...form, companyName: e.target.value})} />
                        </div>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                            <input type="email" placeholder="E-mail" className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} />
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-slate-400" size={20} />
                            <input type="text" placeholder="Usuário (Login) *" className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none lowercase" required value={form.username} onChange={(e) => setForm({...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})} />
                        </div>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                            <input type="password" placeholder="Senha *" minLength={6} className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" required value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} />
                        </div>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 text-slate-400" size={20} />
                            <input type="text" placeholder="Telefone" className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} />
                        </div>

                        <button disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed">
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    CRIAR CONTA
                                    <ArrowRight size={20} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm">
                        <Link to="/" className="text-slate-500 hover:text-blue-600">Já tenho uma conta. Voltar para Login</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};
