// @ts-nocheck
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Save, Plus, X, Tag } from 'lucide-react';

export const VitrineSettings = () => {
  const { settings, updateSettings, isFreeVersion } = useStore();
  
  const [newSize, setNewSize] = useState('');
  const [newColor, setNewColor] = useState('');
  const [newNumber, setNewNumber] = useState('');

  const vitrineConfig = settings.vitrineConfig || {
    availableSizes: [],
    availableColors: [],
    availableNumbers: []
  };

  const handleAddVariant = (type: 'availableSizes' | 'availableColors' | 'availableNumbers', value: string, setValue: React.Dispatch<React.SetStateAction<string>>) => {
    if (!value.trim()) return;
    const currentList = vitrineConfig[type] || [];
    if (currentList.includes(value.trim())) {
      setValue('');
      return;
    }
    
    updateSettings({
      ...settings,
      vitrineConfig: {
        ...vitrineConfig,
        [type]: [...currentList, value.trim()]
      }
    });
    setValue('');
  };

  const handleRemoveVariant = (type: 'availableSizes' | 'availableColors' | 'availableNumbers', value: string) => {
    updateSettings({
      ...settings,
      vitrineConfig: {
        ...vitrineConfig,
        [type]: (vitrineConfig[type] || []).filter(v => v !== value)
      }
    });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <div className="mb-6">
        <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
          <Tag size={20} className="text-orange-500" /> 
          Configurações da Vitrine
        </h3>
        <p className="text-sm text-slate-500 mt-1">Configure os tamanhos, cores e números padrão que poderão ser selecionados ao cadastrar um produto.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Tamanhos */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h4 className="font-bold text-slate-700 mb-4">Tamanhos (P, M, G, etc.)</h4>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              className="flex-1 border border-slate-300 rounded p-2 text-sm outline-none uppercase" 
              placeholder="Ex: GG" 
              value={newSize} 
              onChange={e => setNewSize(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleAddVariant('availableSizes', newSize, setNewSize)}
            />
            <button 
              onClick={() => handleAddVariant('availableSizes', newSize, setNewSize)} 
              className="bg-primary text-white p-2 rounded hover:bg-slate-800"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(vitrineConfig.availableSizes || []).map(size => (
              <span key={size} className="bg-white border border-slate-300 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 text-slate-700 shadow-sm">
                {size}
                <button onClick={() => handleRemoveVariant('availableSizes', size)} className="text-red-400 hover:text-red-600">
                  <X size={14} />
                </button>
              </span>
            ))}
            {(!vitrineConfig.availableSizes || vitrineConfig.availableSizes.length === 0) && <p className="text-sm text-slate-400">Nenhum tamanho cadastrado.</p>}
          </div>
        </div>

        {/* Cores */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h4 className="font-bold text-slate-700 mb-4">Cores (Azul, Preto, etc.)</h4>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              className="flex-1 border border-slate-300 rounded p-2 text-sm outline-none capitalize" 
              placeholder="Ex: Vermelho" 
              value={newColor} 
              onChange={e => setNewColor(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddVariant('availableColors', newColor, setNewColor)}
            />
            <button 
              onClick={() => handleAddVariant('availableColors', newColor, setNewColor)} 
              className="bg-primary text-white p-2 rounded hover:bg-slate-800"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(vitrineConfig.availableColors || []).map(color => (
              <span key={color} className="bg-white border border-slate-300 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 text-slate-700 shadow-sm">
                {color}
                <button onClick={() => handleRemoveVariant('availableColors', color)} className="text-red-400 hover:text-red-600">
                  <X size={14} />
                </button>
              </span>
            ))}
            {(!vitrineConfig.availableColors || vitrineConfig.availableColors.length === 0) && <p className="text-sm text-slate-400">Nenhuma cor cadastrada.</p>}
          </div>
        </div>

        {/* Números */}
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <h4 className="font-bold text-slate-700 mb-4">Números (38, 39, etc.)</h4>
          <div className="flex gap-2 mb-4">
            <input 
              type="text" 
              className="flex-1 border border-slate-300 rounded p-2 text-sm outline-none" 
              placeholder="Ex: 42" 
              value={newNumber} 
              onChange={e => setNewNumber(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddVariant('availableNumbers', newNumber, setNewNumber)}
            />
            <button 
              onClick={() => handleAddVariant('availableNumbers', newNumber, setNewNumber)} 
              className="bg-primary text-white p-2 rounded hover:bg-slate-800"
            >
              <Plus size={20} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(vitrineConfig.availableNumbers || []).map(num => (
              <span key={num} className="bg-white border border-slate-300 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 text-slate-700 shadow-sm">
                {num}
                <button onClick={() => handleRemoveVariant('availableNumbers', num)} className="text-red-400 hover:text-red-600">
                  <X size={14} />
                </button>
              </span>
            ))}
            {(!vitrineConfig.availableNumbers || vitrineConfig.availableNumbers.length === 0) && <p className="text-sm text-slate-400">Nenhum número cadastrado.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};
