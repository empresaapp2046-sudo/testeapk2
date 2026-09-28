// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { Product, CompanySettings } from '../types';
import Barcode from 'react-barcode';
import { Plus, Trash2 } from 'lucide-react';
import { localDb } from '../lib/local-db';

interface PrintBatch {
    id: string;
    color?: string;
    size?: string;
    number?: string;
    qty: number;
}

interface Props {
    product: Product;
    settings: CompanySettings;
    onClose: () => void;
}

interface PrinterProfile {
    name: string;
    paperType: 'A4' | 'custom';
    unit: 'cm' | 'mm';
    width: number;
    height: number;
    labelsPerRow: number;
    marginTop: number; // mm
    marginLeft: number; // mm
    gapX: number; // mm
    gapY: number; // mm
}

const PROFILES_KEY = 'smartpdv_label_printers';
const LAST_KEY = 'smartpdv_label_last_printer';

const loadProfiles = (): PrinterProfile[] => {
    try { return JSON.parse(localDb.getItem(PROFILES_KEY) || '[]') || []; } catch { return []; }
};

export const BarcodeLabelPrint: React.FC<Props> = ({ product, settings, onClose }) => {
    const base = settings.labelConfig || {};
    const [profiles, setProfiles] = useState<PrinterProfile[]>(loadProfiles);
    const [cfg, setCfg] = useState<PrinterProfile>(() => {
        const list = loadProfiles();
        const last = localDb.getItem(LAST_KEY);
        const found = list.find(p => p.name === last);
        if (found) return found;
        const u = base.unit === 'mm' ? 'mm' : 'cm';
        const m = (v: any, d: number) => v === undefined || v === null ? d : (u === 'cm' ? Number(v) * 10 : Number(v));
        return {
            name: '',
            paperType: base.paperType === 'custom' ? 'custom' : 'A4',
            unit: u,
            width: Number(base.width) || 6,
            height: Number(base.height) || 4,
            labelsPerRow: Number(base.labelsPerRow) || 3,
            marginTop: m(base.marginTop, 10),
            marginLeft: m(base.marginLeft, 0),
            gapX: m(base.gapX, 0),
            gapY: m(base.gapY, 0),
        };
    });
    const setField = (k: keyof PrinterProfile, v: any) => setCfg(c => ({ ...c, [k]: v }));
    const [labelScale, setLabelScale] = useState<number>(100);

    const unitToMM = (v: number) => cfg.unit === 'cm' ? (Number(v) || 0) * 10 : (Number(v) || 0);
    const wMM = unitToMM(cfg.width) || 1;
    const hMM = unitToMM(cfg.height) || 1;
    const perRow = Math.max(1, parseInt(String(cfg.labelsPerRow)) || 1);
    const gX = Number(cfg.gapX) || 0;
    const gY = Number(cfg.gapY) || 0;
    const mT = Number(cfg.marginTop) || 0;
    const mL = Number(cfg.marginLeft) || 0;
    const a4Rows = Math.max(1, Math.floor((297 - mT + gY) / (hMM * (labelScale / 100) + gY)));

    const config = {
        showStoreName: true,
        showProductName: true,
        showVariations: true,
        showBarcode: true,
        showPrice: true,
        ...base,
        paperType: cfg.paperType,
        unit: 'mm',
        width: wMM,
        height: hMM,
        labelsPerRow: perRow,
        rowsPerPage: a4Rows,
        marginTop: mT,
        marginBottom: 0,
        marginLeft: mL,
        marginRight: 0,
        gapX: gX,
        gapY: gY,
    };

    const printRef = useRef<HTMLDivElement>(null);

    const hasColors = !!(product.colors && product.colors.length > 0);
    const hasSizes = !!(product.sizes && product.sizes.length > 0);
    const hasNumbers = !!(product.numbers && product.numbers.length > 0);
    const isFashion = hasColors || hasSizes || hasNumbers;

    const totalLabels = config.paperType === 'A4' ? (config.labelsPerRow * config.rowsPerPage) : config.labelsPerRow;

    const [batches, setBatches] = useState<PrintBatch[]>(() => {
        const initialVar: string | undefined = (product as any)._initialVariationToPrint;
        let initColor = hasColors && product.colors?.length === 1 ? product.colors[0] : '';
        let initSize = hasSizes && product.sizes?.length === 1 ? product.sizes[0] : '';
        let initNumber = hasNumbers && product.numbers?.length === 1 ? product.numbers[0] : '';

        if (initialVar) {
            if (product.colors?.includes(initialVar)) initColor = initialVar;
            if (product.sizes?.includes(initialVar)) initSize = initialVar;
            if (product.numbers?.includes(initialVar)) initNumber = initialVar;
        }

        return [{
            id: '1',
            qty: totalLabels || 1,
            color: initColor,
            size: initSize,
            number: initNumber
        }];
    });

    const handlePrint = () => {
        if (isFashion && hasColors) {
            const missingColor = batches.find(b => !b.color);
            if (missingColor) {
                alert("Por favor, selecione a cor para todas as etiquetas.");
                return;
            }
        }
        const printContent = printRef.current;
        if (!printContent) return;

        // Salva o modelo de impressora usado (por nome) para reimpressões futuras
        const pname = (cfg.name || '').trim() || (cfg.paperType === 'A4' ? `A4 ${cfg.width}x${cfg.height}${cfg.unit}` : `Etiqueta ${cfg.width}x${cfg.height}${cfg.unit}`);
        const saved = { ...cfg, name: pname };
        const list = [...loadProfiles().filter(p => p.name !== pname), saved];
        localDb.setItem(PROFILES_KEY, JSON.stringify(list));
        localDb.setItem(LAST_KEY, pname);
        setProfiles(list);
        setCfg(saved);

        const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
        if (!windowPrint) return;

        windowPrint.document.write(`
            <html>
                <head>
                    <title>Imprimir Etiquetas - ${product.name}</title>
                    <style>
                        @page { 
                             margin: 0;
                             size: ${config.paperType === 'A4' ? 'A4' : 'auto'};
                        }
                        body {
                            margin: 0;
                            padding: 0;
                            font-family: Arial, sans-serif;
                             -webkit-print-color-adjust: exact !important;
                             print-color-adjust: exact !important;
                        }
                        .page {
                             display: grid;
                             grid-template-columns: repeat(${effectivePerRow}, ${wMM * scaleMultiplier}mm);
                             column-gap: ${gX}mm;
                             row-gap: ${gY}mm;
                             align-content: flex-start;
                             justify-content: flex-start;
                             padding-top: ${mT}mm;
                             padding-left: ${mL}mm;
                             ${config.paperType === 'A4' ? 'width: 210mm; height: 297mm; page-break-after: always;' : 'width: fit-content;'}
                             box-sizing: border-box;
                        }
                        /* Remove page break from last element */
                        .page:last-child {
                             page-break-after: auto;
                        }
                        .label-container {
                            width: ${config.width}${config.unit};
                            height: ${config.height}${config.unit};
                            box-sizing: border-box;
                            border: 1px dashed transparent; /* invisible on print normally, but you can set to #ccc to debug */
                            padding: 2mm;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            text-align: center;
                            overflow: hidden;
                            zoom: ${labelScale / 100};
                        }
                        .store-name { font-weight: bold; font-size: 10pt; text-transform: uppercase; margin-bottom: 2px; }
                        .product-name { font-weight: bold; font-size: 9pt; margin-bottom: 2px;
                                         max-width: 100%; line-height: 1.1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                        .variations { font-size: 7pt; margin-bottom: 2px; color: #333; }
                        .price { font-weight: bold; font-size: 12pt; margin-top: 2px; }
                        .barcode-wrapper { width: 100%; display: flex; justify-content: center; }
                        .barcode-wrapper svg, .barcode-wrapper img { max-width: 100%; height: auto; max-height: 40px; }
                        .custom-text { font-size: 7pt; margin-top: 2px; }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                </body>
            </html>
        `);
        windowPrint.document.close();
        windowPrint.focus();
        setTimeout(() => {
            windowPrint.print();
            windowPrint.close();
        }, 500);
    };

    const parsedQuantity = isFashion 
        ? batches.reduce((acc, b) => acc + (parseInt(String(b.qty)) || 0), 0)
        : (batches[0] ? parseInt(String(batches[0].qty)) || 1 : 1);
        
    const scaleMultiplier = labelScale / 100;

    // Convert dimensions to MM for calculation
    const toMM = (val: number, unit: string) => unit === 'cm' ? val * 10 : unit === 'in' ? val * 25.4 : val;
    const baseWidthMM = toMM(config.width, config.unit);
    const baseHeightMM = toMM(config.height, config.unit);
    
    // Scale dimensions
    const scaledWidthMM = baseWidthMM * scaleMultiplier;
    const scaledHeightMM = baseHeightMM * scaleMultiplier;
    
    // Quantas etiquetas realmente cabem por linha na largura da folha A4 (210mm)
    const fitsPerRowA4 = Math.max(1, Math.floor((210 - mL + gX) / (scaledWidthMM + gX)));
    const effectivePerRow = config.paperType === 'A4'
        ? Math.min(Math.max(1, perRow), fitsPerRowA4)
        : Math.max(1, perRow);
    const dynamicLabelsPerRow = effectivePerRow;
    const dynamicRowsPerPage = config.rowsPerPage || 1;

    const dynamicTotalPerPage = config.paperType === 'A4' ? (dynamicLabelsPerRow * dynamicRowsPerPage) : dynamicLabelsPerRow;
    const pagesCount = config.paperType === 'A4' ? Math.ceil(parsedQuantity / dynamicTotalPerPage) : 1;
    const sheets = Math.max(1, Math.ceil(parsedQuantity / Math.max(1, dynamicTotalPerPage)));

    const currentPrice = (product.promotionActive && product.promotionalPrice) ? product.promotionalPrice : product.price;

    const renderSingleLabel = (batch?: PrintBatch) => {
        let variationsStr = '';
        if (isFashion && batch) {
            const parts = [];
            if (batch.size) parts.push(`Tam: ${batch.size}`);
            if (batch.color) parts.push(`Cor: ${batch.color}`);
            if (batch.number) parts.push(`Núm: ${batch.number}`);
            variationsStr = parts.join(' | ');
        } else {
            const variations = [];
            if (product.sizes?.length === 1) variations.push(`Tam: ${product.sizes[0]}`);
            if (product.colors?.length === 1) variations.push(`Cor: ${product.colors[0]}`);
            if (product.numbers?.length === 1) variations.push(`Núm: ${product.numbers[0]}`);
            variationsStr = variations.join(' | ');
        }

        const orderedFields = config.fieldOrder || ['storeName', 'productName', 'variations', 'barcode', 'price', 'customText'];
        return (
            <div className="label-container" style={{ border: '1px dashed transparent' }}>
                {orderedFields.map(field => {
                    switch (field) {
                        case 'storeName': return config.showStoreName ? <div key={field} className="store-name">{settings.name || 'Loja'}</div> : null;
                        case 'productName': return config.showProductName ? <div key={field} className="product-name">{product.name}</div> : null;
                        case 'variations': return config.showVariations && variationsStr ? <div key={field} className="variations">{variationsStr}</div> : null;
                        case 'barcode': return config.showBarcode && product.code ? (
                            <div key={field} className="barcode-wrapper">
                                <Barcode value={product.code} format="CODE128" width={1.5} height={30} displayValue={true} fontSize={10} margin={0} background="transparent" renderer="img" />
                            </div>
                        ) : null;
                        case 'price': return config.showPrice ? <div key={field} className="price">R$ {currentPrice.toFixed(2)}</div> : null;
                        case 'customText': return config.customText ? <div key={field} className="custom-text">{config.customText}</div> : null;
                        default: return null;
                    }
                })}
            </div>
        );
    };

    // Escala da folha na pré-visualização: reduz a página para caber no painel,
    // sem cortar etiquetas nas bordas.
    const previewPaneRef = useRef<HTMLDivElement | null>(null);
    const [paneWidth, setPaneWidth] = useState(0);
    useEffect(() => {
        const el = previewPaneRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(() => setPaneWidth(el.clientWidth));
        ro.observe(el);
        setPaneWidth(el.clientWidth);
        return () => ro.disconnect();
    }, []);
    const pxPerMM = 96 / 25.4;
    const pageSizeMM = config.paperType === 'A4' ? { w: 210, h: 297 } : { w: wMM * dynamicLabelsPerRow * scaleMultiplier + gX * (dynamicLabelsPerRow - 1) + mL, h: hMM * scaleMultiplier + mT };
    const pagePxW = pageSizeMM.w * pxPerMM;
    const pageFitZoom = paneWidth > 40 && pagePxW > paneWidth - 64 ? Math.max(0.3, (paneWidth - 64) / pagePxW) : 1;

    const pagePreviewStyle: React.CSSProperties = {
        display: 'grid',
        gridTemplateColumns: `repeat(${dynamicLabelsPerRow}, ${wMM * scaleMultiplier}mm)`,
        columnGap: `${gX}mm`,
        rowGap: `${gY}mm`,
        alignContent: 'start',
        justifyContent: 'start',
        backgroundColor: 'white',
        paddingTop: `${mT}mm`,
        paddingLeft: `${mL}mm`,
        marginBottom: '20px',
        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        overflow: 'hidden',
        boxSizing: 'border-box'
    };

    const generateHtmlPages = (isPreview = false) => {
        const pages: React.ReactNode[] = [];

        const allLabels: (PrintBatch | undefined)[] = [];
        if (isFashion) {
            batches.forEach(b => {
                const q = parseInt(String(b.qty)) || 0;
                for (let i = 0; i < q; i++) allLabels.push(b);
            });
        } else {
            const q = parseInt(String(batches[0]?.qty)) || 1;
            for (let i = 0; i < q; i++) allLabels.push(undefined);
        }

        const totalToPrint = allLabels.length;

        // Rolo / Etiqueta: linhas contínuas com a qtde configurada por linha.
        // Na pré-visualização, mostra apenas a primeira linha.
        if (config.paperType !== 'A4') {
            for (let i = 0; i < totalToPrint; i += dynamicLabelsPerRow) {
                if (isPreview && i > 0) break;

                const row = allLabels.slice(i, i + dynamicLabelsPerRow);
                pages.push(
                    <div key={`roll-${i}`} className="page" style={isPreview ? {
                        ...pagePreviewStyle,
                        width: 'fit-content'
                    } : {}}>
                        {row.map((b, idx) => (
                            <React.Fragment key={`roll-${i}-${idx}`}>{renderSingleLabel(b)}</React.Fragment>
                        ))}
                    </div>
                );
            }
            return pages;
        }

        // Folha A4: página de 210x297mm preenchida linha a linha conforme configurado
        const labelsPerPage = Math.max(1, dynamicTotalPerPage);
        let labelCounter = 0;
        const totalPages = Math.max(1, Math.ceil(totalToPrint / labelsPerPage));
        for (let p = 0; p < totalPages; p++) {
            const items = [];
            for (let l = 0; l < labelsPerPage && labelCounter < totalToPrint; l++) {
                items.push(
                    <React.Fragment key={`label-${p}-${l}`}>
                        {renderSingleLabel(allLabels[labelCounter])}
                    </React.Fragment>
                );
                labelCounter++;
            }
            pages.push(
                <div key={`page-${p}`} className="page" style={isPreview ? {
                    ...pagePreviewStyle,
                    width: '210mm',
                    height: '297mm',
                    position: 'relative'
                } : {}}>
                    {items}
                </div>
            );
        }
        return pages;
    };

    const updateBatch = (id: string, field: keyof PrintBatch, value: any) => {
        setBatches(batches.map(b => {
            if (b.id === id) {
                const updated = { ...b, [field]: value };
                if (field === 'size' && value) updated.number = '';
                if (field === 'number' && value) updated.size = '';
                return updated;
            }
            return b;
        }));
    };

    const addBatch = () => {
        setBatches([...batches, { id: Date.now().toString(), qty: 1, color: '', size: '', number: '' }]);
    };

    const removeBatch = (id: string) => {
        if (batches.length > 1) {
            setBatches(batches.filter(b => b.id !== id));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h2 className="text-xl font-bold text-slate-800">Visualização de Etiquetas</h2>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex flex-col md:flex-row gap-6">
                    {/* Controls */}
                    <div className="w-full md:w-80 bg-white p-4 rounded-xl shadow-sm border border-slate-200 h-fit shrink-0">
                        <h3 className="font-bold text-slate-700 mb-4">Configuração Rápida</h3>
                        
                        {!isFashion ? (
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-600 mb-1">Qtd. de Etiquetas</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    className="w-full border rounded-lg p-2 text-sm"
                                    value={batches[0]?.qty || ''}
                                    onChange={(e) => updateBatch(batches[0].id, 'qty', e.target.value === '' ? '' : parseInt(e.target.value) || 1)}
                                />
                            </div>
                        ) : (
                            <div className="mb-4 space-y-4">
                                <label className="block text-sm font-bold text-slate-700">Variações para Imprimir</label>
                                {batches.map((batch) => (
                                    <div key={batch.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 relative">
                                        {batches.length > 1 && (
                                            <button onClick={() => removeBatch(batch.id)} className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full hover:bg-red-200">
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                        <div className="grid grid-cols-1 gap-2">
                                            {hasColors && (
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Cor *</label>
                                                    <select className="w-full text-xs p-1.5 border rounded" value={batch.color} onChange={e => updateBatch(batch.id, 'color', e.target.value)}>
                                                        <option value="">Selecione...</option>
                                                        {product.colors?.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            {hasSizes && (
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Tamanho</label>
                                                    <select disabled={!!batch.number} className="w-full text-xs p-1.5 border rounded disabled:opacity-50" value={batch.size} onChange={e => updateBatch(batch.id, 'size', e.target.value)}>
                                                        <option value="">Nenhum</option>
                                                        {product.sizes?.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            {hasNumbers && (
                                                <div>
                                                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Número</label>
                                                    <select disabled={!!batch.size} className="w-full text-xs p-1.5 border rounded disabled:opacity-50" value={batch.number} onChange={e => updateBatch(batch.id, 'number', e.target.value)}>
                                                        <option value="">Nenhum</option>
                                                        {product.numbers?.map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                            )}
                                            <div>
                                                <label className="block text-[10px] font-bold text-slate-500 mb-1">Qtd</label>
                                                <input type="number" min="1" className="w-full text-xs p-1.5 border rounded" value={batch.qty || ''} onChange={e => updateBatch(batch.id, 'qty', e.target.value === '' ? '' : parseInt(e.target.value) || 1)} />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={addBatch} className="w-full py-2 bg-indigo-50 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-100 flex justify-center items-center gap-1">
                                    <Plus size={16} /> Adicionar Variação
                                </button>
                            </div>
                        )}

                        <div className="mb-4 p-3 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                            <h4 className="text-sm font-bold text-slate-700">Impressora / Formato</h4>
                            {profiles.length > 0 && (
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Modelos salvos</label>
                                    <div className="flex gap-1">
                                        <select className="flex-1 text-sm p-1.5 border rounded bg-white" value={profiles.some(p => p.name === cfg.name) ? cfg.name : ''} onChange={e => { const f = profiles.find(p => p.name === e.target.value); if (f) setCfg(f); }}>
                                            <option value="">Selecione um modelo...</option>
                                            {profiles.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                                        </select>
                                        {profiles.some(p => p.name === cfg.name) && (
                                            <button title="Excluir modelo" className="px-2 text-red-600 bg-red-50 rounded hover:bg-red-100" onClick={() => { const list = profiles.filter(p => p.name !== cfg.name); localDb.setItem(PROFILES_KEY, JSON.stringify(list)); setProfiles(list); }}>
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-500 mb-1">Nome da impressora</label>
                                <input className="w-full text-sm p-1.5 border rounded bg-white" placeholder="Ex: Elgin L42 5x3" value={cfg.name} onChange={e => setField('name', e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Formato</label>
                                    <select className="w-full text-sm p-1.5 border rounded bg-white" value={cfg.paperType} onChange={e => setField('paperType', e.target.value)}>
                                        <option value="A4">Folha A4</option>
                                        <option value="custom">Rolo / Etiqueta</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Unidade</label>
                                    <select className="w-full text-sm p-1.5 border rounded bg-white" value={cfg.unit} onChange={e => { const u = e.target.value; setCfg(c => { if (c.unit === u) return c; const f = u === 'mm' ? 10 : 0.1; return { ...c, unit: u, width: +(c.width * f).toFixed(2), height: +(c.height * f).toFixed(2) }; }); }}>
                                        <option value="cm">cm</option>
                                        <option value="mm">mm</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Largura ({cfg.unit})</label>
                                    <input type="number" step="0.1" min="0" className="w-full text-sm p-1.5 border rounded bg-white" value={cfg.width} onChange={e => setField('width', e.target.value === '' ? '' : parseFloat(e.target.value))} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Altura ({cfg.unit})</label>
                                    <input type="number" step="0.1" min="0" className="w-full text-sm p-1.5 border rounded bg-white" value={cfg.height} onChange={e => setField('height', e.target.value === '' ? '' : parseFloat(e.target.value))} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Etiquetas por linha</label>
                                    <input type="number" min="1" className="w-full text-sm p-1.5 border rounded bg-white" value={cfg.labelsPerRow} onChange={e => setField('labelsPerRow', e.target.value === '' ? '' : parseInt(e.target.value))} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Margem superior (mm)</label>
                                    <input type="number" step="0.5" min="0" className="w-full text-sm p-1.5 border rounded bg-white" value={cfg.marginTop} onChange={e => setField('marginTop', e.target.value === '' ? '' : parseFloat(e.target.value))} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Margem esquerda (mm)</label>
                                    <input type="number" step="0.5" min="0" className="w-full text-sm p-1.5 border rounded bg-white" value={cfg.marginLeft} onChange={e => setField('marginLeft', e.target.value === '' ? '' : parseFloat(e.target.value))} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Espaço horizontal (mm)</label>
                                    <input type="number" step="0.5" min="0" className="w-full text-sm p-1.5 border rounded bg-white" value={cfg.gapX} onChange={e => setField('gapX', e.target.value === '' ? '' : parseFloat(e.target.value))} />
                                </div>
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Espaço vertical (mm)</label>
                                    <input type="number" step="0.5" min="0" className="w-full text-sm p-1.5 border rounded bg-white" value={cfg.gapY} onChange={e => setField('gapY', e.target.value === '' ? '' : parseFloat(e.target.value))} />
                                </div>
                            </div>
                            {cfg.paperType === 'A4' && !isFashion && (
                                <div>
                                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Quantidade de folhas ({config.rowsPerPage} linhas por folha)</label>
                                    <input type="number" min="1" className="w-full text-sm p-1.5 border rounded bg-white" value={sheets} onChange={e => { const n = Math.max(1, parseInt(e.target.value) || 1); updateBatch(batches[0].id, 'qty', n * dynamicLabelsPerRow * dynamicRowsPerPage); }} />
                                </div>
                            )}
                            <p className="text-[11px] text-slate-500">Ao imprimir, este modelo é salvo pelo nome para reimprimir depois.</p>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-slate-600 mb-1">Escala da Etiqueta (%)</label>
                            <input 
                                type="range" 
                                min="10" 
                                max="1000" 
                                value={labelScale} 
                                onChange={(e) => setLabelScale(parseInt(e.target.value))} 
                                className="w-full"
                            />
                            <div className="text-right text-xs text-slate-500 font-bold mt-1">{labelScale}%</div>
                        </div>

                        <div className="text-sm text-slate-500 mb-6 bg-slate-50 p-3 rounded-lg border">
                            <p><strong>Formato:</strong> {config.paperType}</p>
                            <p><strong>Dimensões:</strong> {cfg.width}x{cfg.height}{cfg.unit}</p>
                            <p><strong>Por Linha:</strong> {dynamicLabelsPerRow}{config.paperType === 'A4' && dynamicLabelsPerRow < Math.max(1, perRow) ? ` (cabem ${dynamicLabelsPerRow} de ${perRow} pedidas)` : ''}</p>
                            {config.paperType === 'A4' && <p><strong>Linhas por folha:</strong> {dynamicRowsPerPage}</p>}
                            {config.paperType === 'A4' && <p><strong>Por Página:</strong> {dynamicTotalPerPage}</p>}
                            <p className="mt-2 text-orange-600 font-medium">{config.paperType === 'A4' ? `Serão geradas ${pagesCount} ${pagesCount === 1 ? 'página' : 'páginas'} (${sheets} ${sheets === 1 ? 'folha' : 'folhas'}).` : `Rolo contínuo com ${parsedQuantity} ${parsedQuantity === 1 ? 'etiqueta' : 'etiquetas'} (${dynamicLabelsPerRow} por linha).`}</p>
                        </div>
                        
                        <button onClick={handlePrint} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect width="12" height="8" x="6" y="14"></rect></svg>
                            Imprimir
                        </button>
                        
                    </div>

                    {/* Preview Area */}
                    <div ref={previewPaneRef} className="flex-1 bg-white p-8 rounded-xl shadow-sm border border-slate-200 overflow-y-auto min-h-[500px] flex flex-col items-center bg-slate-200">
                        <style dangerouslySetInnerHTML={{__html: `
                            .label-container {
                                width: ${config.width}${config.unit};
                                height: ${config.height}${config.unit};
                                box-sizing: border-box;
                                border: 1px dashed #ccc !important;
                                padding: 2mm;
                                display: flex;
                                flex-direction: column;
                                align-items: center;
                                justify-content: center;
                                text-align: center;
                                overflow: hidden;
                                zoom: ${scaleMultiplier};
                            }
                            .label-container .store-name { font-weight: bold; font-size: 10pt; text-transform: uppercase; margin-bottom: 2px; }
                            .label-container .product-name { font-weight: bold; font-size: 9pt; margin-bottom: 2px; max-width: 100%; line-height: 1.1; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                            .label-container .variations { font-size: 7pt; margin-bottom: 2px; color: #333; }
                            .label-container .price { font-weight: bold; font-size: 12pt; margin-top: 2px; }
                            .label-container .barcode-wrapper { width: 100%; display: flex; justify-content: center; }
                            .label-container .barcode-wrapper svg, .label-container .barcode-wrapper img { max-width: 100%; height: auto; max-height: 40px; }
                            .label-container .custom-text { font-size: 7pt; margin-top: 2px; }
                        `}} />
                        <div style={{ zoom: pageFitZoom }}>
                            {generateHtmlPages(true)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Hidden container for actual printing */}
            <div style={{ display: 'none' }}>
                <div ref={printRef}>
                    {generateHtmlPages()}
                </div>
            </div>
        </div>
    );
}
