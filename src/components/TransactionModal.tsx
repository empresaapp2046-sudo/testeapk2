// @ts-nocheck
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { CashTransaction } from '../types';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'sangria' | 'suprimento';
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, type }) => {
    const { addCashTransaction, cashSession, currentUser, users } = useStore();
    const [value, setValue] = useState('');
    const [description, setDescription] = useState('');
    const [supervisorUsername, setSupervisorUsername] = useState('');
    const [supervisorPassword, setSupervisorPassword] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const authorizeSupervisor = async () => {
        if (!supervisorUsername) return null;
        const q = query(collection(db, 'users'), where('username', '==', supervisorUsername));
        const s = await getDocs(q);
        if (s.empty) return null;
        const d = { ...s.docs[0].data(), id: s.docs[0].id };
        
        // Check if supervisor
        if (d.role !== 'Fiscal' && d.role !== 'AdminGeral') return null;

        // Check password
        if (d.password === supervisorPassword) return d.id;
        
        return null;
    };

    const handleSubmit = async () => {
        const amount = parseFloat(value.replace(',', '.'));
        if (isNaN(amount) || amount <= 0) {
            setError('Valor inválido');
            return;
        }
        if (!cashSession) {
            setError('Nenhum caixa aberto');
            return;
        }

        const supervisorId = await authorizeSupervisor();
        if (!supervisorId) {
            setError('Supervisor não autorizado ou senha incorreta');
            return;
        }

        await addCashTransaction({
            sessionId: cashSession.id,
            tenantId: cashSession.tenantId,
            type: type,
            value: type === 'sangria' ? -amount : amount,
            description,
            operatorId: currentUser?.id || '',
            authorizedBy: supervisorId,
            timestamp: new Date().toISOString()
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
                <h2 className="text-xl font-bold mb-4 capitalize">{type}</h2>
                <input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Valor" className="w-full p-2 border rounded mb-2" />
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição" className="w-full p-2 border rounded mb-2" />
                <h3 className="font-bold mt-4 mb-2">Autorização do Supervisor</h3>
                <input type="text" value={supervisorUsername} onChange={(e) => setSupervisorUsername(e.target.value)} placeholder="Usuário Supervisor" className="w-full p-2 border rounded mb-2" />
                <input type="password" value={supervisorPassword} onChange={(e) => setSupervisorPassword(e.target.value)} placeholder="Senha" className="w-full p-2 border rounded mb-4" />
                {error && <p className="text-red-500 mb-4">{error}</p>}
                <div className="flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button>
                    <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded">Confirmar</button>
                </div>
            </div>
        </div>
    );
};
