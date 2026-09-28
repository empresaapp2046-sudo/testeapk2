// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { useStore } from '../context/StoreContext';
import { Shield } from 'lucide-react';

export const AutoLogin = () => {
    const search = useSearch({ from: '/autologin' });
    const navigate = useNavigate();
    const { autoLogin } = useStore();
    const [status, setStatus] = useState('Validando acesso...');
    const token = search.token;


    useEffect(() => {
        const attemptLogin = async () => {
            if (!token) {
                setStatus('Link inválido (Token não fornecido).');
                return;
            }

            try {
                const res = await autoLogin(token);
                
                if (res.success) {
                    localStorage.setItem('autoLoginToken', token);
                    navigate({ to: '/' });
                } else {
                    setStatus(res.message || 'Link inválido ou expirado.');
                }
            } catch (e) {
                console.error(e);
                setStatus('Erro ao processar login automático.');
            }
        };

        attemptLogin();
    }, [token, autoLogin, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-xl shadow-lg border border-slate-200 text-center max-w-sm w-full">
                <Shield className="w-16 h-16 text-indigo-500 mx-auto mb-4 animate-pulse" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">Acesso Automático</h2>
                <p className="text-sm text-slate-500">{status}</p>
            </div>
        </div>
    );
};
