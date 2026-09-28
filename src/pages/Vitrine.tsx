// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, Link as RouterLink } from '../lib/router-compat';
import { useStore } from '../context/StoreContext';
import { ShoppingBag, MessageCircle, Copy, X, Check, Send, Link, Lock, Loader2, Search, Filter, Store, MapPin, Phone, Settings, Star, CheckCircle } from 'lucide-react';
import { Product, CompanySettings, RaffleCampaign } from '../types';
import { collection, query, getDocs, limit, onSnapshot, where, doc } from 'firebase/firestore';
import { db } from '../firebase';

export const Vitrine = () => {
    const { storeSlug } = useParams({ strict: false });
    const { products, settings, currentUser, raffleCampaigns, changeCustomerPassword } = useStore();
    
    // Public State for unauthenticated sharing
    const [publicProducts, setPublicProducts] = useState<Product[]>([]);
    const [publicRaffleCampaigns, setPublicRaffleCampaigns] = useState<RaffleCampaign[]>([]);
    const [publicSettings, setPublicSettings] = useState<CompanySettings | null>(null);
    const [isLoadingPublic, setIsLoadingPublic] = useState(true);

    const clickTimes = useRef<number[]>([]);
    
    const handleLogoClick = () => {
        const now = Date.now();
        clickTimes.current = [...clickTimes.current, now].filter(t => now - t < 1500);
        if (clickTimes.current.length >= 5) {
            clickTimes.current = [];
            // Redireciona para o login da loja atual se houver storeId (slug), caso contrário para o login global
            const loginPath = storeSlug ? `/${storeSlug}/login` : '/login';
            console.log('Redirecting to login:', loginPath);
            window.location.href = loginPath;

        }
    };

    useEffect(() => {
        // If we already have products from context (owner is logged in) AND no storeId is provided,
        // we show the logged-in user's store.
        // If a storeId is provided, we MUST show that store's data, regardless of who is logged in.
        const isGuestUser = !currentUser || currentUser.role === 'guest_user' || !!storeSlug;
        
        let unsubSettings = () => {};
        let unsubProducts = () => {};
        let unsubRaffleCampaigns = () => {};

        if (isGuestUser) {
            try {
                // Determine which owner's data to fetch

                // Real-time Settings
                if (storeSlug) {
                    unsubSettings = onSnapshot(doc(db, 'settings', storeSlug), (docSnap) => {
                        if (docSnap.exists()) {
                            const sData = { id: docSnap.id, ...docSnap.data() } as CompanySettings;
                            setPublicSettings(sData);
                        } else {
                            setPublicSettings(null);
                        }
                    });
                } else {
                    const settingsQ = query(collection(db, 'settings'), limit(1));
                    unsubSettings = onSnapshot(settingsQ, (snap) => {
                        if (!snap.empty) {
                            const sData = { id: snap.docs[0].id, ...snap.docs[0].data() } as CompanySettings;
                            setPublicSettings(sData);
                        } else {
                            setPublicSettings(null);
                        }
                    });
                }

                const productsQ = storeSlug 
                    ? query(collection(db, 'products'), where('ownerId', '==', storeSlug))
                    : query(collection(db, 'products'));

                // Real-time Products
                unsubProducts = onSnapshot(productsQ, (snap) => {
                    const loadedProducts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
                    setPublicProducts(loadedProducts);
                    setIsLoadingPublic(false);
                });

                const rafflesQ = storeSlug
                    ? query(collection(db, 'raffle_campaigns'), where('ownerId', '==', storeSlug))
                    : query(collection(db, 'raffle_campaigns'));
                
                unsubRaffleCampaigns = onSnapshot(rafflesQ, (snap) => {
                    const loadedRaffles = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RaffleCampaign));
                    setPublicRaffleCampaigns(loadedRaffles);
                });
            } catch (error) {
                console.error("Erro ao carregar dados públicos", error);
                setTimeout(() => setIsLoadingPublic(false), 0);
            }
        } else {
             setTimeout(() => setIsLoadingPublic(false), 0);
        }

        return () => {
            unsubSettings();
            unsubProducts();
        };
    }, [currentUser, storeSlug]);

    const isExplicitStore = !!storeSlug;
    const isGuest = !currentUser || currentUser.role === 'guest_user';
    const shouldUsePublicData = isGuest || isExplicitStore;

    const activeSettings = shouldUsePublicData ? publicSettings : settings;
    const activeProducts = shouldUsePublicData ? publicProducts : products;
    const activeRaffleCampaigns = (shouldUsePublicData ? publicRaffleCampaigns : raffleCampaigns) || [];
    
    // Filter currently running campaigns
    const runningCampaigns = activeRaffleCampaigns.filter(c => c.active && new Date(c.startDate) <= new Date() && new Date(c.endDate) >= new Date());
    
    // sortedPlans logic removed as per user request to hide plans from public vitrine.
    const sortedPlans = [];

    const baseProducts = useMemo(() => activeProducts.filter(p => p.showInVitrine !== false), [activeProducts]);

    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterBrand, setFilterBrand] = useState<string>('all');
    const [filterTab, setFilterTab] = useState<'todos' | 'categorias' | 'marcas' | 'promocoes'>('todos');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [minPrice, setMinPrice] = useState<number | ''>('');
    const [maxPrice, setMaxPrice] = useState<number | ''>('');

    const availableCategories = Array.from(new Set(baseProducts.map(p => p.category).filter(Boolean))) as string[];
    const availableBrands = Array.from(new Set(baseProducts.map(p => p.brand).filter(Boolean))) as string[];

    const isGeneralPromoActive = (product: Product) => {
        if (!product.promotionActive || !product.promotionalPrice) return false;
        const now = new Date();
        now.setHours(0,0,0,0);
        if (product.promotionStartDate) {
            const start = new Date(product.promotionStartDate + 'T00:00:00');
            if (now < start) return false;
        }
        if (product.promotionEndDate) {
            const end = new Date(product.promotionEndDate + 'T23:59:59');
            if (now > end) return false;
        }
        return true;
    };

    const isVariationPromoActive = (product: Product, opt: string) => {
        if (!product.variationPromotions?.[opt]) return false;
        const vp = product.variationPromotions[opt];
        if (!vp.promotionActive || !vp.promotionalPrice) return false;
        const now = new Date();
        now.setHours(0,0,0,0);
        if (vp.promotionStartDate) {
            const start = new Date(vp.promotionStartDate + 'T00:00:00');
            if (now < start) return false;
        }
        if (vp.promotionEndDate) {
            const end = new Date(vp.promotionEndDate + 'T23:59:59');
            if (now > end) return false;
        }
        return true;
    };

    const isPromoActive = (product: Product) => {
        if (isGeneralPromoActive(product)) return true;
        if (product.variationPromotions) {
            return Object.keys(product.variationPromotions).some(opt => isVariationPromoActive(product, opt));
        }
        return false;
    };

    const getProductDisplayPrice = (product: Product) => {
        if (isGeneralPromoActive(product)) {
            return product.promotionalPrice!;
        }
        if (product.variationPromotions) {
            const activeVps = Object.keys(product.variationPromotions)
                .filter(opt => isVariationPromoActive(product, opt))
                .map(opt => product.variationPromotions![opt].promotionalPrice!)
                .filter(price => typeof price === 'number' && !isNaN(price));
            if (activeVps.length > 0) {
                return Math.min(...activeVps);
            }
        }
        if (product.variationPrices && Object.keys(product.variationPrices).length > 0) {
            const varPrices = Object.values(product.variationPrices).filter(p => p > 0);
            if (varPrices.length > 0) {
                return Math.min(product.price, ...varPrices);
            }
        }
        return product.price;
    };

    const vitrineProducts = baseProducts.filter(p => {
        if (filterTab === 'promocoes' && !isPromoActive(p)) return false;
        if (filterCategory !== 'all' && p.category !== filterCategory) return false;
        if (filterBrand !== 'all' && p.brand !== filterBrand) return false;
        if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        
        const currentPrice = getProductDisplayPrice(p);
        if (minPrice !== '' && currentPrice < minPrice) return false;
        if (maxPrice !== '' && currentPrice > maxPrice) return false;
        
        return true;
    });



    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const [selectedNumber, setSelectedNumber] = useState('');

    const getSelectedVariation = (product: Product) => {
        if (product.sizes && product.sizes.length > 1) return selectedSize;
        if (product.colors && product.colors.length > 1) return selectedColor;
        if (product.numbers && product.numbers.length > 1) return selectedNumber;
        return '';
    };

    const getCurrentSelectedStock = (product: Product) => {
        const opt = getSelectedVariation(product);
        if (opt && product.variationStock && product.variationStock[opt] !== undefined) {
            return product.variationStock[opt];
        }
        return product.stock;
    };

    const getModalPriceInfo = (product: Product) => {
        const opt = getSelectedVariation(product);
        let basePrice = product.price;
        if (opt && product.variationPrices?.[opt] !== undefined && product.variationPrices[opt] > 0) {
            basePrice = product.variationPrices[opt];
        }

        if (opt && isVariationPromoActive(product, opt)) {
            const vp = product.variationPromotions![opt];
            const promotionalPrice = vp.promotionalPrice!;
            const discountPct = Math.round(((basePrice - promotionalPrice) / basePrice) * 100);
            return {
                isPromo: true,
                price: basePrice,
                promotionalPrice,
                discountPct,
                endDate: vp.promotionEndDate
            };
        }
        
        if (isGeneralPromoActive(product)) {
            const promotionalPrice = product.promotionalPrice!;
            const discountPct = Math.round(((product.price - promotionalPrice) / product.price) * 100);
            return {
                isPromo: true,
                price: product.price,
                promotionalPrice,
                discountPct,
                endDate: product.promotionEndDate
            };
        }
        
        return {
            isPromo: false,
            price: basePrice,
            promotionalPrice: null,
            discountPct: 0
        };
    };
    const [chatOpen, setChatOpen] = useState(false);
    const [message, setMessage] = useState('');
    
    // Simple local chat storage for Demo/MVP
    const [chatMessages, setChatMessages] = useState<{sender: 'client' | 'admin', text: string, time: string, image?: string, clientName?: string}[]>(() => {
        const currentStoreSlug = storeSlug || (settings?.username);
        const saved = localStorage.getItem(`vitrine_chat_${currentStoreSlug}`);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn("Erro ao carregar chat", e);
            }
        }
        return [];
    });
    const [showAboutUs, setShowAboutUs] = useState(false);
    const [showClientSettings, setShowClientSettings] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [isSavingPassword, setIsSavingPassword] = useState(false);


    useEffect(() => {
        const currentStoreSlug = storeSlug || (activeSettings?.username);
        if (chatMessages.length > 0 && currentStoreSlug) {
            localStorage.setItem(`vitrine_chat_${currentStoreSlug}`, JSON.stringify(chatMessages));
        }
    }, [chatMessages, storeSlug, activeSettings?.username]);


    const [selectedPlanTab, setSelectedPlanTab] = useState(0);

    const handleOpenProduct = (product: Product) => {
        let activeOpt = '';
        
        // Check which dimension is actually the varying one (length > 1)
        const varyingType = product.sizes && product.sizes.length > 1 ? 'sizes' :
                            product.colors && product.colors.length > 1 ? 'colors' :
                            product.numbers && product.numbers.length > 1 ? 'numbers' : null;
                            
        if (varyingType) {
            const options = product[varyingType] || [];
            // 1. Try to find the first option that has an active variation promotion
            const firstPromoOpt = options.find(opt => isVariationPromoActive(product, opt));
            if (firstPromoOpt) {
                activeOpt = firstPromoOpt;
            }
            
            // 2. If no promo variation found, find first option with stock > 0
            if (!activeOpt) {
                const firstStocked = options.find(opt => (product.variationStock?.[opt] ?? 0) > 0);
                if (firstStocked) {
                    activeOpt = firstStocked;
                } else if (options.length > 0) {
                    activeOpt = options[0];
                }
            }
        }

        // Set selections based on dimension lengths
        if (product.sizes && product.sizes.length > 0) {
            if (product.sizes.length === 1) {
                setSelectedSize(product.sizes[0]);
            } else {
                setSelectedSize(activeOpt);
            }
        } else {
            setSelectedSize('');
        }

        if (product.colors && product.colors.length > 0) {
            if (product.colors.length === 1) {
                setSelectedColor(product.colors[0]);
            } else {
                setSelectedColor(activeOpt);
            }
        } else {
            setSelectedColor('');
        }

        if (product.numbers && product.numbers.length > 0) {
            if (product.numbers.length === 1) {
                setSelectedNumber(product.numbers[0]);
            } else {
                setSelectedNumber(activeOpt);
            }
        } else {
            setSelectedNumber('');
        }

        setSelectedProduct(product);
    };

    const isOwnerOnline = currentUser && currentUser.isOnline && currentUser.role !== 'guest_user';

    const handleSendChat = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if(!message.trim()) return;

        let clientName = localStorage.getItem('vitrine_client_name');
        if (!clientName && currentUser && currentUser.role !== 'guest_user') {
            clientName = currentUser.name || currentUser.username;
        }

        if (!clientName) {
            const name = prompt("Por favor, informe seu nome para iniciar o chat:");
            if (!name || !name.trim()) return;
            clientName = name.trim();
            localStorage.setItem('vitrine_client_name', clientName);
        }

        const newMsg = { 
            sender: 'client' as const, 
            text: message, 
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            clientName 
        };
        
        const currentStoreSlug = storeSlug || (activeSettings?.username);
        const chatKey = `vitrine_chat_${currentStoreSlug}`;
        const updatedMessages = [...chatMessages, newMsg];
        
        if (!isOwnerOnline) {
            setTimeout(() => {
                const autoReply = { sender: 'admin' as const, text: 'Olá! Não estamos online no momento, mas logo responderemos sua mensagem.', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
                setChatMessages(prev => [...prev, autoReply]);
                localStorage.setItem(chatKey, JSON.stringify([...updatedMessages, autoReply]));
            }, 1000);
        }

        setChatMessages(updatedMessages);
        localStorage.setItem(chatKey, JSON.stringify(updatedMessages));
        setMessage('');
    };


    const handleSendToWhatsApp = () => {
        if(!selectedProduct) return;
        const opts = [];
        if(selectedSize) opts.push(`Tamanho: ${selectedSize}`);
        if(selectedColor) opts.push(`Cor: ${selectedColor}`);
        if(selectedNumber) opts.push(`Número: ${selectedNumber}`);
        
        const priceInfo = getModalPriceInfo(selectedProduct);
        const finalPrice = priceInfo.isPromo && priceInfo.promotionalPrice ? priceInfo.promotionalPrice : priceInfo.price;
        
        const text = `Olá, me interessei por: *${selectedProduct.name}*${selectedProduct.code ? ` (Código: ${selectedProduct.code})` : ''}\nPreço: R$ ${finalPrice.toFixed(2)}\n${opts.length > 0 ? opts.join(' | ') : ''}\n\nImagem: ${selectedProduct.image || 'Sem imagem'}`;
        
        let phone = activeSettings?.phone || '41988192359';
        // strip non-digits
        phone = phone.replace(/\D/g, '');
        if (phone) {
            window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(text)}`, '_blank');
        } else {
            alert('Lojista não configurou o telefone.');
        }
    };

    const handleSendProductToChat = () => {
        if(!selectedProduct) return;
        const opts = [];
        if(selectedSize) opts.push(`Tamanho: ${selectedSize}`);
        if(selectedColor) opts.push(`Cor: ${selectedColor}`);
        if(selectedNumber) opts.push(`Número: ${selectedNumber}`);
        
        const priceInfo = getModalPriceInfo(selectedProduct);
        const finalPrice = priceInfo.isPromo && priceInfo.promotionalPrice ? priceInfo.promotionalPrice : priceInfo.price;
        
        const text = `Olá, me interessei por: *${selectedProduct.name}*${selectedProduct.code ? ` (Código: ${selectedProduct.code})` : ''}\nPreço: R$ ${finalPrice.toFixed(2)}\n${opts.length > 0 ? opts.join(' | ') : ''}`;
        
        let clientName = localStorage.getItem('vitrine_client_name');
        if (!clientName && currentUser && currentUser.role !== 'guest_user') {
            clientName = currentUser.name || currentUser.username;
        }

        if (!clientName) {
            const name = prompt("Por favor, informe seu nome para iniciar o chat:");
            if (!name || !name.trim()) return;
            clientName = name.trim();
            localStorage.setItem('vitrine_client_name', clientName);
        }

        const newMsg = { 
            sender: 'client' as const, 
            text, 
            time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), 
            image: selectedProduct.image,
            clientName
        };
        
        const currentStoreSlug = storeSlug || (activeSettings?.username);
        const chatKey = `vitrine_chat_${currentStoreSlug}`;
        const updatedMessages = [...chatMessages, newMsg];
        
        if (!isOwnerOnline) {
            setTimeout(() => {
                const autoReply = { sender: 'admin' as const, text: 'Olá! Não estamos online no momento, mas vimos seu interesse. Logo responderemos!', time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) };
                setChatMessages(prev => [...prev, autoReply]);
                localStorage.setItem(chatKey, JSON.stringify([...updatedMessages, autoReply]));
            }, 1000);
        }

        setChatMessages(updatedMessages);
        localStorage.setItem(chatKey, JSON.stringify(updatedMessages));
        setSelectedProduct(null);

        setChatOpen(true);
    };

    const copyProductLink = (product: Product) => {
        const currentStoreSlug = storeSlug || activeSettings?.id || '';
        const url = `${window.location.origin}/#/vitrine/${currentStoreSlug}?product=${product.id}`;
        navigator.clipboard.writeText(url);
        alert('Link do produto copiado!');
    };

    const copyStoreLink = async () => {
        const currentStoreSlug = storeSlug || activeSettings?.id || '';
        const url = `${window.location.origin}/#/vitrine/${currentStoreSlug}`;
        try {
            await navigator.clipboard.writeText(url);
            alert('Link da loja copiado!');
        } catch (err) {
            const textArea = document.createElement("textarea");
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                alert('Link da loja copiado!');
            } catch (e) {
                alert('Link: ' + url);
            }
            document.body.removeChild(textArea);
        }
    };

    return (
        <div className="bg-slate-950 min-h-screen text-slate-200 font-sans selection:bg-orange-500 selection:text-white pb-24">
            {/* Header */}
            <header className="bg-slate-900 border-b border-orange-500/30 sticky top-0 z-40 shadow-2xl shadow-orange-900/20">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3 cursor-pointer select-none group" onClick={handleLogoClick}>
                            <img 
                                src={activeSettings?.logo || `https://drive.google.com/thumbnail?id=1kh4-T3wHvgRiwAS4Kejaeonbu-8VNr2-&sz=w1000`} 
                                className="h-10 w-auto object-contain drop-shadow-[0_0_8px_rgba(249,115,22,0.8)] group-hover:scale-105 transition-transform" 
                                alt="Logo" 
                                onError={(e) => {
                                    e.currentTarget.src = `https://drive.google.com/thumbnail?id=1kh4-T3wHvgRiwAS4Kejaeonbu-8VNr2-&sz=w1000`;
                                }}
                            />
                            <RouterLink to="/" className="hover:opacity-90 transition-opacity">
                                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">{activeSettings?.name || 'Smart PDV PRO'}</h1>
                                <p className="text-xs text-orange-200/60">Vitrine Virtual</p>
                            </RouterLink>
                        </div>

                        {(activeSettings?.aboutUs?.enabled || activeSettings?.whatsappVitrinePosition === 'top') && (
                            <div className="hidden md:flex items-center gap-4 ml-4 pl-4 border-l border-slate-700/50">
                                {activeSettings?.aboutUs?.enabled && (
                                    <button onClick={() => setShowAboutUs(true)} className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                                        Sobre Nós
                                    </button>
                                )}
                                {activeSettings?.whatsappVitrinePosition === 'top' && activeSettings?.phone && (
                                    <button 
                                        onClick={() => {
                                            const phone = activeSettings.phone!.replace(/\D/g, '');
                                            if (phone) window.open(`https://wa.me/55${phone}`, '_blank');
                                        }}
                                        className="flex items-center gap-2 text-sm font-bold text-[#25D366] hover:text-[#20BD5C] transition-colors"
                                    >
                                        <MessageCircle size={18} /> Contate-nos pelo WhatsApp
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="flex md:hidden items-center gap-2 mr-2">
                             {activeSettings?.aboutUs?.enabled && (
                                <button onClick={() => setShowAboutUs(true)} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-white bg-slate-800 rounded-full border border-slate-700">
                                    <Store size={18} />
                                </button>
                            )}
                            {activeSettings?.whatsappVitrinePosition === 'top' && activeSettings?.phone && (
                                <button 
                                    onClick={() => {
                                        const phone = activeSettings.phone!.replace(/\D/g, '');
                                        if (phone) window.open(`https://wa.me/55${phone}`, '_blank');
                                    }}
                                    className="w-10 h-10 flex items-center justify-center text-white bg-[#25D366] rounded-full shadow-[0_0_10px_rgba(37,211,102,0.3)]"
                                >
                                    <MessageCircle size={18} />
                                </button>
                            )}
                        </div>
                        <button onClick={copyStoreLink} className="hidden sm:flex items-center gap-2 px-4 py-2 border border-orange-500/50 hover:bg-orange-500/10 text-orange-400 rounded-full font-medium transition-all text-sm">
                            <Link size={16} /> Compartilhar Loja
                        </button>
                        <button onClick={copyStoreLink} className="sm:hidden w-10 h-10 flex items-center justify-center border border-orange-500/50 hover:bg-orange-500/10 text-orange-400 rounded-full transition-all">
                            <Link size={16} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 py-8">
                
                {/* Nossos Planos - Section removed for public Vitrine */}
                
                {/* FILTERS */}
                <div className="mb-8 flex justify-center">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl shadow-black/50 w-full max-w-4xl">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex flex-1 min-w-[200px] relative">
                                <Search className="absolute left-3 top-3 text-slate-500" size={18} />
                                <input 
                                    type="text"
                                    placeholder="Buscar produto..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-slate-200 focus:border-orange-500 focus:outline-none placeholder-slate-600 text-sm"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                                <button 
                                    onClick={() => { setFilterTab('todos'); setFilterCategory('all'); setFilterBrand('all'); }} 
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterTab === 'todos' ? 'bg-orange-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                                >Todos</button>
                                <button 
                                    onClick={() => { setFilterTab('marcas'); setFilterCategory('all'); }} 
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterTab === 'marcas' ? 'bg-orange-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                                >Marcas</button>
                                <button 
                                    onClick={() => { setFilterTab('categorias'); setFilterBrand('all'); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterTab === 'categorias' ? 'bg-orange-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
                                >Categorias</button>
                                {baseProducts.some(isPromoActive) && (
                                    <button 
                                        onClick={() => { setFilterTab('promocoes'); setFilterCategory('all'); setFilterBrand('all'); }}
                                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${filterTab === 'promocoes' ? 'bg-orange-500 text-slate-950 shadow-md' : 'text-orange-400 hover:text-orange-300 hover:bg-slate-800 border border-orange-500/20'}`}
                                    >Promoções</button>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-slate-500 text-sm"><Filter size={16}/></span>
                                <input 
                                    type="number"
                                    placeholder="Min R$"
                                    className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-2 py-2.5 text-slate-200 focus:border-orange-500 focus:outline-none placeholder-slate-600 text-sm text-center"
                                    value={minPrice}
                                    onChange={e => setMinPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                />
                                <span className="text-slate-600">-</span>
                                <input 
                                    type="number"
                                    placeholder="Max R$"
                                    className="w-20 bg-slate-950 border border-slate-800 rounded-xl px-2 py-2.5 text-slate-200 focus:border-orange-500 focus:outline-none placeholder-slate-600 text-sm text-center"
                                    value={maxPrice}
                                    onChange={e => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
                                />
                            </div>
                        </div>
                        
                        {filterTab === 'marcas' && availableBrands.length > 0 && (
                            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800 overflow-x-auto pb-2 scrollbar-hide">
                                <button onClick={() => setFilterBrand('all')} className={`px-4 py-1.5 rounded-full font-medium text-sm whitespace-nowrap transition-colors ${filterBrand === 'all' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                                    Todas as Marcas
                                </button>
                                {availableBrands.map(b => (
                                    <button key={b} onClick={() => setFilterBrand(b)} className={`px-4 py-1.5 rounded-full font-medium text-sm whitespace-nowrap transition-colors ${filterBrand === b ? 'bg-orange-500 text-white font-bold shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                                        {b}
                                    </button>
                                ))}
                            </div>
                        )}

                        {filterTab === 'categorias' && availableCategories.length > 0 && (
                            <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800 overflow-x-auto pb-2 scrollbar-hide">
                                <button onClick={() => setFilterCategory('all')} className={`px-4 py-1.5 rounded-full font-medium text-sm whitespace-nowrap transition-colors ${filterCategory === 'all' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 font-bold' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                                    Todas as Categorias
                                </button>
                                {availableCategories.map(c => (
                                    <button key={c} onClick={() => setFilterCategory(c)} className={`px-4 py-1.5 rounded-full font-medium text-sm whitespace-nowrap transition-colors ${filterCategory === c ? 'bg-orange-500 text-white font-bold shadow-md' : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                                        {c}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {isLoadingPublic ? (
                    <div className="text-center py-20 flex flex-col items-center">
                        <Loader2 className="animate-spin text-orange-500 mb-4" size={48} />
                        <h2 className="text-xl font-bold text-slate-400">Carregando vitrine...</h2>
                    </div>
                ) : vitrineProducts.length === 0 ? (
                    <div className="text-center py-20">
                        <ShoppingBag className="mx-auto text-slate-800 mb-4" size={64} />
                        <h2 className="text-2xl font-bold text-slate-600 mb-2">Nenhum produto disponível</h2>
                        <p className="text-slate-500">Volte mais tarde para conferir as novidades!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {vitrineProducts.map(product => {
                            const isPromo = isPromoActive(product);
                            const displayPrice = getProductDisplayPrice(product);
                            const discountPct = isPromo ? Math.round(((product.price - displayPrice) / product.price) * 100) : 0;
                            const threshold = activeSettings?.vitrineConfig?.lowStockThreshold ?? 3;
                            const isLowStock = product.stock <= threshold;
                            
                            return (
                                <div key={product.id} className="bg-slate-900 rounded-2xl border border-slate-800 hover:border-orange-500/50 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] transition-all overflow-hidden group flex flex-col cursor-pointer h-full" onClick={() => handleOpenProduct(product)}>
                                    <div className="aspect-square bg-slate-800/50 relative overflow-hidden">
                                        {isPromo && discountPct > 0 && (
                                            <div className="absolute top-3 left-3 z-10 bg-orange-500 text-white text-xs font-black px-2 py-1 rounded shadow-md">
                                                -{discountPct}%
                                            </div>
                                        )}
                                        {product.image ? (
                                            <img src={product.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={product.name} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-700">
                                                <ShoppingBag size={48} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent opacity-90" />
                                        <div className="absolute bottom-3 left-3 text-white font-black drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                                            {isPromo ? (
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-orange-200 line-through opacity-80 leading-tight">R$ {product.price.toFixed(2)}</span>
                                                    <span className="text-2xl text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.6)]">R$ {displayPrice.toFixed(2)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-2xl">R$ {product.price.toFixed(2)}</span>
                                            )}
                                        </div>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); copyProductLink(product); }}
                                            className="absolute top-3 right-3 z-10 bg-slate-900/80 p-2 rounded-full text-slate-300 hover:text-white hover:bg-orange-500 border border-slate-700 backdrop-blur-sm transition-colors opacity-0 group-hover:opacity-100 shadow-lg"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                    <div className="p-4 flex flex-col flex-1">
                                        <h3 className="font-bold text-slate-200 line-clamp-1">{product.name}</h3>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{product.category}</p>
                                        <div className="mt-auto pt-3">
                                            {product.stock <= 0 ? (
                                                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 bg-slate-800/50 px-2 py-1 rounded w-full justify-center border border-slate-700">
                                                    <span>Esgotado</span>
                                                </div>
                                            ) : isLowStock ? (
                                                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded w-full justify-center border border-red-500/20">
                                                    <MessageCircle size={12} />
                                                    <span>Verificar disponibilidade</span>
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Product Details Modal */}
            {selectedProduct && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
                    <div className="bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-800 shadow-2xl flex flex-col md:flex-row relative">
                        <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 z-10 bg-slate-800/80 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                            <X size={20} />
                        </button>

                        {/* Image Side */}
                        <div className="md:w-1/2 aspect-square md:aspect-auto bg-slate-800/50 flex items-center justify-center relative overflow-hidden">
                             {selectedProduct.image ? (
                                <img src={selectedProduct.image} className="w-full h-full object-cover" alt={selectedProduct.name} />
                             ) : (
                                <ShoppingBag size={64} className="text-slate-700" />
                             )}
                        </div>

                        {/* Details Side */}
                        <div className="md:w-1/2 p-6 md:p-8 flex flex-col">
                            <h2 className="text-3xl font-black text-slate-100 mb-1">{selectedProduct.name}</h2>
                            {selectedProduct.code && (
                                <span className="text-sm text-slate-500 font-mono mb-4 block">Ref: {selectedProduct.code}</span>
                            )}
                            
                            {(() => {
                                const currentStock = getCurrentSelectedStock(selectedProduct);
                                const threshold = activeSettings?.vitrineConfig?.lowStockThreshold ?? 3;
                                
                                if (currentStock <= 0) {
                                    return (
                                        <div className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-400 bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700 w-fit">
                                            <span>Produto/Variação Esgotada</span>
                                        </div>
                                    );
                                } else if (currentStock <= threshold) {
                                    return (
                                        <div className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-red-500 bg-red-500/10 px-3 py-2 rounded-lg border border-red-500/20 w-fit animate-pulse">
                                            <MessageCircle size={16} />
                                            <span>Verifique disponibilidade com o vendedor</span>
                                        </div>
                                    );
                                }
                                return null;
                            })()}
                            
                            {(() => {
                                const { isPromo, price, promotionalPrice, discountPct, endDate } = getModalPriceInfo(selectedProduct);
                                if (isPromo && promotionalPrice) {
                                    return (
                                        <div className="mb-6 bg-slate-900 border border-orange-500/30 p-4 rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                                            <div className="flex items-center gap-3 mb-1">
                                                <span className="text-xl text-orange-200/60 line-through">R$ {price.toFixed(2)}</span>
                                                <span className="bg-orange-500 text-white text-sm font-black px-2 py-1 rounded shadow-sm">
                                                    -{discountPct}%
                                                </span>
                                            </div>
                                            <div className="text-4xl font-black bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent flex items-end gap-2 drop-shadow-sm">
                                                R$ {promotionalPrice.toFixed(2)}
                                            </div>
                                            <div className="text-sm text-slate-400 font-medium mt-1">
                                                (Desconto de R$ {(price - promotionalPrice).toFixed(2)})
                                            </div>
                                            {endDate && (
                                                <div className="text-xs text-orange-400 mt-3 font-bold bg-orange-500/10 px-2 py-1 rounded w-fit">
                                                    Promoção válida até {new Date(endDate + 'T23:59:59').toLocaleDateString('pt-BR')}
                                                </div>
                                            )}
                                            {!endDate && (
                                                <div className="text-xs text-orange-400 mt-3 font-bold bg-orange-500/10 px-2 py-1 rounded w-fit">
                                                    Promoção válida enquanto durarem os estoques.
                                                </div>
                                            )}
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className="mb-6">
                                            <div className="text-4xl font-black bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent drop-shadow-sm">
                                                R$ {price.toFixed(2)}
                                            </div>
                                        </div>
                                    );
                                }
                            })()}

                            {(() => {
                                const getStock = (opt) => {
                                    if (selectedProduct.variationStock && selectedProduct.variationStock[opt] !== undefined) {
                                        return selectedProduct.variationStock[opt];
                                    }
                                    return selectedProduct.stock;
                                };

                                return (
                                    <>
                                        {selectedProduct.sizes && selectedProduct.sizes.length > 0 && (
                                            <div className="mb-6">
                                                <span className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Tamanho</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedProduct.sizes.map(s => {
                                                        const st = getStock(s);
                                                        const isEsgotado = st <= 0;
                                                        const hasPromo = isVariationPromoActive(selectedProduct, s);
                                                        return (
                                                        <button 
                                                            key={s} 
                                                            disabled={isEsgotado}
                                                            onClick={() => setSelectedSize(s)}
                                                            className={`min-w-[3rem] px-3 py-2 rounded-lg font-bold text-sm border transition-all ${
                                                                isEsgotado 
                                                                    ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed line-through' 
                                                                    : selectedSize === s 
                                                                        ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' 
                                                                        : hasPromo
                                                                            ? 'bg-orange-950/40 border-orange-500/70 text-orange-400 hover:bg-orange-950/60 shadow-[0_0_8px_rgba(249,115,22,0.2)]'
                                                                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                                                            }`}
                                                        >
                                                            <span className="block">{s}</span>
                                                            {hasPromo && <span className="text-[9px] block font-black text-orange-400 uppercase leading-none mt-0.5">Oferta</span>}
                                                            {isEsgotado && <span className="text-[10px] block font-normal">Esgotado</span>}
                                                        </button>
                                                    )})}
                                                </div>
                                            </div>
                                        )}

                                        {selectedProduct.colors && selectedProduct.colors.length > 0 && (
                                            <div className="mb-6">
                                                <span className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Cor</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedProduct.colors.map(c => {
                                                        const st = getStock(c);
                                                        const isEsgotado = st <= 0;
                                                        const hasPromo = isVariationPromoActive(selectedProduct, c);
                                                        return (
                                                        <button 
                                                            key={c} 
                                                            disabled={isEsgotado}
                                                            onClick={() => setSelectedColor(c)}
                                                            className={`px-4 py-2 rounded-lg font-bold text-sm border uppercase transition-all ${
                                                                isEsgotado 
                                                                    ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed line-through' 
                                                                    : selectedColor === c 
                                                                        ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' 
                                                                        : hasPromo
                                                                            ? 'bg-orange-950/40 border-orange-500/70 text-orange-400 hover:bg-orange-950/60 shadow-[0_0_8px_rgba(249,115,22,0.2)]'
                                                                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                                                            }`}
                                                        >
                                                            <span className="block">{c}</span>
                                                            {hasPromo && <span className="text-[9px] block font-black text-orange-400 uppercase leading-none mt-0.5">Oferta</span>}
                                                            {isEsgotado && <span className="text-[10px] block font-normal">Esgotado</span>}
                                                        </button>
                                                    )})}
                                                </div>
                                            </div>
                                        )}

                                        {selectedProduct.numbers && selectedProduct.numbers.length > 0 && (
                                            <div className="mb-8">
                                                <span className="block text-sm font-bold text-slate-400 mb-2 uppercase tracking-wider">Número</span>
                                                <div className="flex flex-wrap gap-2">
                                                    {selectedProduct.numbers.map(n => {
                                                        const st = getStock(n);
                                                        const isEsgotado = st <= 0;
                                                        const hasPromo = isVariationPromoActive(selectedProduct, n);
                                                        return (
                                                        <button 
                                                            key={n} 
                                                            disabled={isEsgotado}
                                                            onClick={() => setSelectedNumber(n)}
                                                            className={`min-w-[3rem] px-3 py-2 rounded-lg font-bold text-sm border transition-all ${
                                                                isEsgotado 
                                                                    ? 'bg-slate-800 border-slate-700 text-slate-600 cursor-not-allowed line-through' 
                                                                    : selectedNumber === n 
                                                                        ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]' 
                                                                        : hasPromo
                                                                            ? 'bg-orange-950/40 border-orange-500/70 text-orange-400 hover:bg-orange-950/60 shadow-[0_0_8px_rgba(249,115,22,0.2)]'
                                                                            : 'bg-slate-800 border-slate-700 text-slate-300 hover:border-slate-500'
                                                            }`}
                                                        >
                                                            <span className="block">{n}</span>
                                                            {hasPromo && <span className="text-[9px] block font-black text-orange-400 uppercase leading-none mt-0.5">Oferta</span>}
                                                            {isEsgotado && <span className="text-[10px] block font-normal">Esgotado</span>}
                                                        </button>
                                                    )})}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                );
                            })()}

                            <div className="mt-auto pt-6 flex flex-col gap-3">
                                <button 
                                    onClick={handleSendToWhatsApp}
                                    className="w-full bg-[#25D366] text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(37,211,102,0.4)] transition-all active:scale-95 text-lg"
                                >
                                    <MessageCircle size={20} /> Falar no WhatsApp
                                </button>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={handleSendProductToChat}
                                        className="flex-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-slate-950 font-black py-4 rounded-xl flex items-center justify-center gap-2 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all active:scale-95 text-lg"
                                    >
                                        <MessageCircle size={20} /> Chat na Vitrine
                                    </button>
                                    <button 
                                        onClick={() => copyProductLink(selectedProduct)}
                                        className="w-14 h-14 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl flex items-center justify-center hover:bg-slate-700 hover:text-white transition-colors flex-shrink-0"
                                        title="Copiar Link"
                                    >
                                        <Copy size={20} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Widgets */}
            <div className="fixed bottom-6 right-6 z-40 flex items-end gap-4">
                {(activeSettings?.whatsappVitrinePosition === 'bottom' || (activeSettings?.whatsappVitrinePosition === undefined && activeSettings?.whatsappVitrineEnabled)) && activeSettings?.phone && (
                    <button 
                        onClick={() => {
                            const phone = activeSettings.phone!.replace(/\D/g, '');
                            if (phone) window.open(`https://wa.me/55${phone}`, '_blank');
                        }}
                        className="w-16 h-16 bg-[#25D366] text-white rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(37,211,102,0.5)] hover:scale-110 transition-transform relative"
                        title="Falar no WhatsApp"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                        </svg>
                    </button>
                )}

                <div className="relative">
                    {!chatOpen && (
                    <button 
                        onClick={() => setChatOpen(true)}
                        className="w-16 h-16 bg-gradient-to-tr from-orange-500 to-yellow-400 text-slate-900 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.5)] hover:scale-110 transition-transform relative group"
                    >
                        <MessageCircle size={32} />
                        {isOwnerOnline ? (
                            <span className="absolute top-0 right-0 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full"></span>
                        ) : (
                            <span className="absolute top-0 right-0 w-4 h-4 bg-slate-500 border-2 border-slate-900 rounded-full tooltip-trigger" title="Offline no momento"></span>
                        )}
                        
                        <div className="absolute right-full mr-4 bg-slate-800 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-700">
                            Fale conosco!
                        </div>
                    </button>
                )}

                {chatOpen && (
                    <div className="w-[350px] max-h-[500px] h-[70vh] bg-slate-900 border border-orange-500/30 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-2xl flex flex-col overflow-hidden animate-fade-in origin-bottom-right">
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 p-4 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                     <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-slate-900 font-bold">
                                        LO
                                     </div>
                                     <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-900 ${isOwnerOnline ? 'bg-green-500' : 'bg-slate-500'}`}></span>
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm">Atendimento</h4>
                                    <p className="text-[10px] text-slate-400">{isOwnerOnline ? 'Online agora' : 'Responderemos em breve'}</p>
                                </div>
                            </div>
                            <button onClick={() => setChatOpen(false)} className="text-slate-400 hover:text-white p-2">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
                            {chatMessages.length === 0 ? (
                                <div className="text-center text-slate-500 text-xs mt-10">
                                    <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
                                    Envie uma mensagem para falar com o lojista.
                                </div>
                            ) : (
                                chatMessages.map((msg, i) => (
                                    <div key={i} className={`flex flex-col ${msg.sender === 'client' ? 'items-end' : 'items-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${msg.sender === 'client' ? 'bg-orange-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'}`}>
                                            {msg.image && (
                                                <div className="mb-2 rounded-lg overflow-hidden border border-white/10">
                                                    <img src={msg.image} alt="Produto" className="w-full h-32 object-cover" />
                                                </div>
                                            )}
                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                                        </div>
                                        <span className="text-[9px] text-slate-500 mt-1 px-1">{msg.time}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        <form onSubmit={handleSendChat} className="p-3 bg-slate-900 border-t border-slate-800">
                            <div className="flex items-center gap-2 bg-slate-950 rounded-xl border border-slate-700 p-1">
                                <input 
                                    type="text" 
                                    className="flex-1 bg-transparent text-sm text-white px-3 py-2 outline-none placeholder:text-slate-500"
                                    placeholder="Digite sua mensagem..."
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                />
                                <button 
                                    type="submit"
                                    className="w-10 h-10 bg-orange-500 text-slate-900 rounded-lg flex items-center justify-center hover:bg-orange-400 transition-colors"
                                    disabled={!message.trim()}
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                </div>
            </div>

            {/* Sobre Nós Modal */}
            {showAboutUs && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-fade-in relative">
                        <button 
                            onClick={() => setShowAboutUs(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10 w-8 h-8 flex items-center justify-center bg-slate-800/50 rounded-full"
                        >
                            <X size={20} />
                        </button>
                        
                        <div className="p-6 border-b border-slate-800 flex items-center gap-4">
                            {activeSettings?.logo ? (
                                <img src={activeSettings.logo} alt="Logo" className="w-16 h-16 rounded-xl object-cover shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-slate-700/50" />
                            ) : (
                                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.5)]">
                                    <ShoppingBag className="text-white" size={32} />
                                </div>
                            )}
                            <div>
                                <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">Sobre a {activeSettings?.name || 'Loja'}</h2>
                                {activeSettings?.address && (
                                    <p className="text-sm text-slate-400 mt-1 flex items-start gap-1">
                                        <MapPin size={14} className="mt-0.5 shrink-0" /> {activeSettings.address}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8 text-slate-300 leading-relaxed text-sm">
                            {activeSettings?.aboutUs?.description && (
                                <div className="whitespace-pre-wrap">
                                    {activeSettings.aboutUs.description}
                                </div>
                            )}

                            {(activeSettings?.aboutUs?.fields || []).filter(f => f.visible).map(field => (
                                <div key={field.id} className="space-y-3">
                                    <h3 className="text-lg font-bold text-white border-b border-slate-800 pb-2">{field.title}</h3>
                                    {field.image && (
                                        <img src={field.image} alt={field.title} className="w-full max-h-64 object-cover rounded-xl border border-slate-700" />
                                    )}
                                    <p className="whitespace-pre-wrap">{field.text}</p>
                                </div>
                            ))}
                            
                            {activeSettings?.phone && (
                                <div className="pt-6 border-t border-slate-800 flex flex-col items-center gap-4">
                                    <div className="text-center">
                                        <h4 className="font-bold text-white mb-1">Dúvidas?</h4>
                                        <p className="text-xs text-slate-400">Fale diretamente com nossa equipe de atendimento.</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            const phone = activeSettings.phone!.replace(/\D/g, '');
                                            if (phone) window.open(`https://wa.me/55${phone}`, '_blank');
                                        }}
                                        className="flex items-center gap-2 bg-[#25D366] text-white px-8 py-3 rounded-xl font-bold shadow-[0_0_15px_rgba(37,211,102,0.3)] hover:scale-105 transition-transform"
                                    >
                                        <MessageCircle size={20} /> Contate-nos pelo WhatsApp
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* CLIENT SETTINGS BUTTON (Only if logged in) */}
            {currentUser && currentUser.role === 'Cliente' && (
                <div className="fixed bottom-24 right-4 z-40">
                    <button 
                        onClick={() => setShowClientSettings(true)}
                        className="bg-slate-800 border border-slate-700 text-white p-3 rounded-full shadow-lg hover:bg-slate-700 transition-colors"
                        title="Configurações da Conta"
                    >
                        <Settings size={24} />
                    </button>
                </div>
            )}

            {/* Client Settings Modal */}
            {showClientSettings && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in">
                        <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-white flex items-center gap-2">
                                <Settings size={18} className="text-orange-500" />
                                Configurações da Conta
                            </h3>
                            <button onClick={() => setShowClientSettings(false)} className="text-slate-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">E-mail de Acesso</label>
                                <input className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-slate-500 text-sm outline-none" value={currentUser?.email || ''} disabled />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Nova Senha</label>
                                <input 
                                    type="password"
                                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm outline-none focus:border-orange-500" 
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1">Confirmar Senha</label>
                                <input 
                                    type="password"
                                    className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white text-sm outline-none focus:border-orange-500" 
                                    value={confirmNewPassword}
                                    onChange={e => setConfirmNewPassword(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={async () => {
                                    if (!newPassword || newPassword.length < 6) {
                                        alert("A senha deve ter pelo menos 6 caracteres.");
                                        return;
                                    }
                                    if (newPassword !== confirmNewPassword) {
                                        alert("As senhas não coincidem!");
                                        return;
                                    }
                                    setIsSavingPassword(true);
                                    const res = await changeCustomerPassword(currentUser.id, newPassword);
                                    setIsSavingPassword(false);
                                    if (res.success) {
                                        alert(res.message);
                                        setShowClientSettings(false);
                                        setNewPassword('');
                                        setConfirmNewPassword('');
                                    } else {
                                        alert(res.message);
                                    }
                                }}
                                disabled={isSavingPassword}
                                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-slate-700 text-slate-950 font-bold py-2.5 rounded-xl transition-colors mt-2"
                            >
                                {isSavingPassword ? 'Salvando...' : 'Salvar Nova Senha'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <footer className="mt-12 py-6 border-t border-slate-800 text-center text-slate-600 text-xs flex flex-col items-center gap-4">
                 <div className="flex gap-4 mb-2">
                     {!currentUser ? (
                         <>
                             <RouterLink 
                                to={`/${storeSlug || activeSettings?.id || ''}/login`} 
                                className="text-orange-500 hover:text-orange-400 font-medium"
                             >
                                Fazer Login
                             </RouterLink>
                             <RouterLink 
                                to={`/${storeSlug || activeSettings?.id || ''}/register`} 
                                className="text-slate-400 hover:text-white font-medium"
                             >
                                Criar Conta
                             </RouterLink>
                         </>
                     ) : (
                         <span className="text-slate-400">Olá, {currentUser.name || currentUser.username}</span>
                     )}
                 </div>
                 <span>© {new Date().getFullYear()} {activeSettings?.name || 'Smart PDV PRO'}.</span>
                 {(!storeSlug && currentUser?.role === 'AdminGeral') && (
                     <RouterLink to="/dashboard" className="text-orange-500 hover:underline">Ir para o Painel</RouterLink>
                 )}
            </footer>
        </div>
    );
};
