// @ts-nocheck
import React, { useState } from 'react';
import { Package, X, Check, Search, AlertTriangle } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';

interface LowStockModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: Product[];
}

export const LowStockModal: React.FC<LowStockModalProps> = ({ isOpen, onClose, products }) => {
    const { updateProduct } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Variation Edit State
    const [editVariationValue, setEditVariationValue] = useState<{ [key: string]: number }>({});
    const [editStockValue, setEditStockValue] = useState<number>(0);

    if (!isOpen) return null;

    const filtered = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.code?.includes(searchTerm));

    const handleEditClick = (p: Product) => {
        setEditingProduct(p);
        if (p.variationStock) {
            setEditVariationValue({ ...p.variationStock });
        } else {
            setEditStockValue(p.stock || 0);
        }
    };

    const handleSaveStock = () => {
        if (!editingProduct) return;
        const hasVariations = (editingProduct.sizes?.length ?? 0) > 1 || (editingProduct.colors?.length ?? 0) > 1 || (editingProduct.numbers?.length ?? 0) > 1;

        if (hasVariations) {
            updateProduct({ ...editingProduct, variationStock: editVariationValue });
        } else {
            updateProduct({ ...editingProduct, stock: editStockValue });
        }
        
        setEditingProduct(null);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-orange-50">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <Package size={20} className="text-orange-600"/> 
                        Produtos com Estoque Baixo
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>

                <div className="p-4 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Buscar produto..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {filtered.length === 0 ? (
                        <div className="text-center text-slate-400 p-8 flex flex-col items-center justify-center">
                            <Check className="w-12 h-12 text-green-400 mb-2"/>
                            <p>Tudo certo! Não há produtos com estoque baixo.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filtered.map(p => (
                                <div key={p.id} className="bg-white border border-slate-100 rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                                            {p.image ? (
                                                <img src={p.image} alt={p.name} className="w-full h-full object-cover"/>
                                            ) : (
                                                <Package className="w-full h-full p-3 text-slate-300" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{p.name}</p>
                                            <p className="text-xs text-slate-500">Cód: {p.code || 'S/C'} | {p.category}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto">
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Estoque</p>
                                            <p className="text-lg font-bold text-orange-600 flex items-center gap-1 justify-end">
                                                <AlertTriangle size={16}/> {p.stock || 0}
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => handleEditClick(p)}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-sm rounded-lg transition-colors"
                                        >
                                            Ajustar
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Stock Modal */}
            {editingProduct && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                         <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">Ajustar Estoque</h3>
                            <button onClick={() => setEditingProduct(null)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                         </div>
                         <div className="p-5">
                            <div className="mb-4">
                                <p className="font-bold text-slate-800">{editingProduct.name}</p>
                                <p className="text-sm text-slate-500">Ajuste as quantidades disponíveis abaixo.</p>
                            </div>

                            {((editingProduct.sizes?.length ?? 0) > 1 || (editingProduct.colors?.length ?? 0) > 1 || (editingProduct.numbers?.length ?? 0) > 1) ? (
                                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                                    {Object.entries(editVariationValue).map(([key, qty]) => (
                                        <div key={key} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                            <span className="font-medium text-slate-700 text-sm">
                                                {key.replace(/-/g, ' | ')}
                                            </span>
                                            <input 
                                                type="number"
                                                min="0"
                                                value={qty}
                                                onChange={(e) => setEditVariationValue(prev => ({...prev, [key]: parseInt(e.target.value) || 0}))}
                                                className="w-20 p-2 text-center border border-slate-300 rounded focus:outline-none focus:border-accent"
                                            />
                                        </div>
                                    ))}
                                    {Object.keys(editVariationValue).length === 0 && (
                                        <p className="text-sm text-slate-500 italic">Este produto possui variações, mas o estoque detalhado não foi iniciado.</p>
                                    )}
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade em Estoque</label>
                                    <input 
                                        type="number"
                                        min="0"
                                        value={editStockValue}
                                        onChange={(e) => setEditStockValue(parseInt(e.target.value) || 0)}
                                        className="w-full p-3 border border-slate-300 rounded-lg focus:outline-none focus:border-accent"
                                    />
                                </div>
                            )}
                         </div>
                         <div className="p-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setEditingProduct(null)} className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                            <button onClick={handleSaveStock} className="px-5 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2">
                                <Check size={18}/> Salvar
                            </button>
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
};
