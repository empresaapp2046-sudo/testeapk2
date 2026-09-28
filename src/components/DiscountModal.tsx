// @ts-nocheck
import React, { useState } from 'react';
import { X } from 'lucide-react';

interface DiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (type: '%' | 'R$', value: number) => void;
  initialType?: '%' | 'R$';
  initialValue?: number;
}

export const DiscountModal: React.FC<DiscountModalProps> = ({ isOpen, onClose, onApply, initialType = '%', initialValue = 0 }) => {
  const [type, setType] = useState<'%' | 'R$'>(initialType);
  const [value, setValue] = useState<string>(initialValue.toString());

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-lg">Desconto por Item</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="flex gap-2 mb-4">
          <button onClick={() => setType('%')} className={`flex-1 py-2 rounded font-bold ${type === '%' ? 'bg-accent text-white' : 'bg-slate-100'}`}>%</button>
          <button onClick={() => setType('R$')} className={`flex-1 py-2 rounded font-bold ${type === 'R$' ? 'bg-accent text-white' : 'bg-slate-100'}`}>R$</button>
        </div>
        <input type="number" value={value} onChange={(e) => setValue(e.target.value)} className="w-full p-3 border rounded-lg mb-4" placeholder="Valor" />
        <button onClick={() => onApply(type, parseFloat(value))} className="w-full py-3 bg-accent text-white rounded-lg font-bold">Aplicar Desconto</button>
      </div>
    </div>
  );
};
