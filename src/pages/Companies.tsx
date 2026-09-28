// @ts-nocheck
import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Building, Plus, Pencil, Trash2, X, Save, MessageCircle, Users, CheckCircle, DollarSign, FileDown, FileText, Download, Eye, QrCode, Copy, History } from 'lucide-react';
import { Company, Customer, Sale, DebtSettlement } from '../types';
import { ConfirmModal } from '../components/ConfirmModal';
import jsPDF from 'jspdf';
import { PlanGate } from '../components/PlanGate';

// PresentationLetterModal Component
const PresentationLetterModal = ({ isOpen, onClose, company, settings, currentUser, onUpdate }: {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  settings: any;
  currentUser: any;
  onUpdate: (company: Company) => Promise<void>;
}) => {
  const [closingDay, setClosingDay] = useState(company.closingDay || '10');
  const [dueDay, setDueDay] = useState(company.dueDay || '15');
  const [isEditing, setIsEditing] = useState(false);

  const defaultLetter = `Assunto: Proposta de Convênio Corporativo – Novo Benefício para os Colaboradores da ${company.name}

Prezado(a) responsável pela ${company.name},

Sabemos que oferecer bons benefícios é essencial para a valorização e retenção da sua equipe. Por isso, a ${settings.name} desenvolveu um programa de Convênio Corporativo prático, sem custos de adesão para a ${company.name} e com vantagens financeiras exclusivas para a empresa.

Como funciona o Convênio?
A ${company.name} estipula um limite de crédito mensal para cada colaborador. Com esse limite, o funcionário pode realizar compras na ${settings.name}, com total comodidade e sem precisar de dinheiro ou cartão de crédito no momento da compra.

Vantagens e Benefícios Exclusivos:
Para o Colaborador (Facilidade): Acesso imediato aos nossos produtos, com o valor das compras descontado diretamente na folha de pagamento.
Para a ${company.name} (Retorno Financeiro): Ao realizar o acerto mensal das compras dos colaboradores, a ${company.name} recebe um desconto exclusivo de ${company.corporateDiscount || 20}% sobre o valor total faturado. Ou seja, se a soma das compras da equipe for de R$ 1.000,00, a empresa desconta esse valor integral na folha dos funcionários, mas repassa à ${settings.name} apenas R$ ${(1000 * (1 - (company.corporateDiscount || 20) / 100)).toFixed(2)}. Os ${company.corporateDiscount || 20}% ficam retidos como margem ou economia para a sua gestão.

Flexibilidade de Pagamento e Parcelamento:
A ${company.name} tem total liberdade para oferecer o parcelamento das compras aos colaboradores, dividindo o desconto em folha nos meses seguintes, conforme a política interna do RH. No entanto, para garantir o desconto de ${company.corporateDiscount || 20}% concedido à sua empresa, o repasse do faturamento total para a ${settings.name} deverá ser feito sempre à vista, na data de vencimento combinada.

Estamos à disposição para agendar uma breve reunião e alinhar os detalhes desse convênio que trará vantagens tanto para a ${company.name} quanto para sua equipe.

Atenciosamente,
${currentUser?.name || 'Responsável'}
${settings.name}
${settings.phone || ''} / WhatsApp`;

  const defaultClauses = `CLÁUSULA 1 - DO OBJETO E LIMITE DE CRÉDITO
A ${company.name.toUpperCase()} fornecerá à ${settings.name.toUpperCase()} uma relação atualizada dos colaboradores autorizados a utilizar o convênio, estipulando um limite máximo de crédito individual de R$ ${company.creditLimit.toFixed(2)}. A ${settings.name.toUpperCase()} compromete-se a respeitar rigorosamente os limites de crédito informados.

CLÁUSULA 2 - DO DESCONTO EM FOLHA
Fica sob total responsabilidade da ${company.name.toUpperCase()} realizar o desconto dos valores gastos por seus colaboradores diretamente em suas respectivas folhas de pagamento (holerite), mediante autorização prévia assinada pelo funcionário no ato da adesão ao benefício.

CLÁUSULA 3 - DO FATURAMENTO E DESCONTO COMERCIAL (${company.corporateDiscount || 20}%)
A ${settings.name.toUpperCase()} emitirá, até o dia ${closingDay} de cada mês, um relatório detalhado (fatura) com todas as compras realizadas pelos colaboradores. Sobre o valor total bruto desta fatura, será aplicado um desconto comercial de ${company.corporateDiscount || 20}% (vinte por cento) em favor da ${company.name.toUpperCase()}. O repasse financeiro à ${settings.name.toUpperCase()} deverá ser feito pelo valor líquido (Total com dedução de ${company.corporateDiscount || 20}%).

CLÁUSULA 4 - DO REPASSE FINANCEIRO E PARCELAMENTO
O pagamento da fatura líquida pela ${company.name.toUpperCase()} à ${settings.name.toUpperCase()} ocorrerá rigorosamente à vista, até o dia ${dueDay} de cada mês.
Parágrafo Único: A ${company.name.toUpperCase()} possui total autonomia para autorizar o parcelamento das compras aos seus colaboradores em até ${company.paymentMethods.term.maxInstallments} vezes, realizando o desconto em folha de forma fracionada nos meses subsequentes. Contudo, essa facilidade concedida ao funcionário não altera a modalidade de repasse à ${settings.name.toUpperCase()}, que permanecerá integral e à vista no fechamento da fatura vigente.`;

  const [letterText, setLetterText] = useState(company.presentationLetter || defaultLetter);
  const [clausesText, setClausesText] = useState(company.presentationLetterClauses || defaultClauses);
  const [selectedBg, setSelectedBg] = useState(1);

  const backgrounds = [
    { id: 1, name: 'Clássico', color: '#1e40af' },
    { id: 2, name: 'Moderno', color: '#334155' },
    { id: 3, name: 'Corporativo', color: '#1e293b' },
    { id: 4, name: 'Elegante', color: '#8b5cf6' },
    { id: 5, name: 'Clean', color: '#94a3b8' }
  ];

  if (!isOpen) return null;

  const drawBackground = (doc: any, bgId: number) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const color = backgrounds.find(b => b.id === bgId)?.color || '#1e40af';

    if (bgId === 1) {
      // Border
      doc.setDrawColor(color);
      doc.setLineWidth(0.5);
      doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
      doc.setLineWidth(2);
      doc.line(margin, 25, pageWidth - margin, 25);
    } else if (bgId === 2) {
      // Side Bar
      doc.setFillColor(color);
      doc.rect(0, 0, 15, pageHeight, 'F');
      doc.setFillColor('#f8fafc');
      doc.rect(15, 0, pageWidth - 15, pageHeight, 'F');
    } else if (bgId === 3) {
      // Header/Footer
      doc.setFillColor(color);
      doc.rect(0, 0, pageWidth, 20, 'F');
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    } else if (bgId === 4) {
      // Corner Accents
      doc.setFillColor(color);
      doc.triangle(0, 0, 40, 0, 0, 40, 'F');
      doc.triangle(pageWidth, pageHeight, pageWidth - 40, pageHeight, pageWidth, pageHeight - 40, 'F');
    } else if (bgId === 5) {
      // Minimalist Line
      doc.setDrawColor(color);
      doc.setLineWidth(1);
      doc.line(margin, 15, pageWidth - margin, 15);
      doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    }
  };

  const handleSave = async () => {
    await onUpdate({
      ...company,
      presentationLetter: letterText,
      presentationLetterClauses: clausesText,
      closingDay,
      dueDay
    });
    setIsEditing(false);
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;
    const lineHeight = 7;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);

    const addRichText = (text: string, fontSize = 11) => {
      doc.setFontSize(fontSize);
      const paragraphs = text.split('\n');
      
      paragraphs.forEach(para => {
        if (!para.trim()) {
          y += lineHeight;
          return;
        }

        // Split by bold markers **
        const parts = para.split(/(\*\*.*?\*\*)/g);

        // Check if we need a new page before starting a paragraph
        if (y > 270) {
          doc.addPage();
          drawBackground(doc, selectedBg);
          y = 25;
        }

        const lines: string[][] = [];
        let currentLine: { text: string, isBold: boolean }[] = [];
        let tempLineText = "";

        parts.forEach(part => {
          const isBold = part.startsWith('**') && part.endsWith('**');
          const cleanText = isBold ? part.slice(2, -2) : part;
          
          const words = cleanText.split(' ');
          words.forEach((word, idx) => {
            const wordWithSpace = idx === words.length - 1 ? word : word + ' ';
            doc.setFont('helvetica', isBold ? 'bold' : 'normal');
            const wordWidth = doc.getTextWidth(wordWithSpace);

            if (doc.getTextWidth(tempLineText + wordWithSpace) > contentWidth) {
              lines.push(currentLine as any);
              currentLine = [{ text: wordWithSpace, isBold }];
              tempLineText = wordWithSpace;
            } else {
              currentLine.push({ text: wordWithSpace, isBold });
              tempLineText += wordWithSpace;
            }
          });
        });
        if (currentLine.length > 0) lines.push(currentLine as any);

        lines.forEach(lineParts => {
          if (y > 275) {
            doc.addPage();
            drawBackground(doc, selectedBg);
            y = 25;
          }
          let xOffset = margin;
          lineParts.forEach((p: any) => {
            doc.setFont('helvetica', p.isBold ? 'bold' : 'normal');
            doc.text(p.text, xOffset, y);
            xOffset += doc.getTextWidth(p.text);
          });
          y += lineHeight;
        });
      });
    };

    drawBackground(doc, selectedBg);
    
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(selectedBg === 3 ? '#ffffff' : '#1e293b');
    doc.text('PROPOSTA DE CONVÊNIO CORPORATIVO', pageWidth / 2, 13, { align: 'center' });
    doc.setTextColor('#1e293b');
    y = 35;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('1. Carta de Apresentação', margin, y);
    y += 10;
    addRichText(letterText);

    // Force second page for clauses to keep it organized and professional
    doc.addPage();
    drawBackground(doc, selectedBg);
    y = 25;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('2. Sugestão de Cláusulas para o Contrato de Convênio', margin, y);
    y += 10;
    addRichText(clausesText);

    doc.save(`Proposta_Convenio_${company.name.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="text-blue-600" /> Carta de Apresentação - {company.name}
          </h2>
          <div className="flex items-center gap-2">
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg flex items-center gap-1 text-sm font-bold"
              >
                <Pencil size={18} /> Editar Texto
              </button>
            ) : (
              <button 
                onClick={handleSave}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg flex items-center gap-1 text-sm font-bold"
              >
                <Save size={18} /> Salvar Edição
              </button>
            )}
            <button onClick={onClose}><X size={24} /></button>
          </div>
        </div>

        <div className="flex gap-4 mb-4 p-4 bg-blue-50 rounded-lg items-end">
          <div className="flex-1">
            <label className="block text-xs font-bold text-blue-800 mb-1">Dia de Fechamento</label>
            <input 
              type="text" 
              value={closingDay} 
              onChange={e => setClosingDay(e.target.value)} 
              className="w-full p-2 border rounded bg-white"
              placeholder="Ex: 10"
              disabled={isEditing}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-blue-800 mb-1">Dia de Vencimento</label>
            <input 
              type="text" 
              value={dueDay} 
              onChange={e => setDueDay(e.target.value)} 
              className="w-full p-2 border rounded bg-white"
              placeholder="Ex: 15"
              disabled={isEditing}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-blue-800 mb-1">Modelo de Fundo (PDF)</label>
            <select 
              value={selectedBg}
              onChange={e => setSelectedBg(Number(e.target.value))}
              className="w-full p-2 border rounded bg-white text-sm"
              disabled={isEditing}
            >
              {backgrounds.map(bg => (
                <option key={bg.id} value={bg.id}>{bg.name}</option>
              ))}
            </select>
          </div>
        </div>

        {isEditing && (
          <div className="mb-4 px-4 py-2 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800">
            <strong>Dica de Formatação:</strong> Use <code>**texto**</code> para deixar o texto em <strong>negrito</strong> no PDF.
          </div>
        )}

        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 rounded-lg border border-slate-200 text-sm text-slate-700 space-y-4 font-serif">
          {isEditing ? (
            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Texto da Carta</label>
                <textarea 
                  value={letterText}
                  onChange={e => setLetterText(e.target.value)}
                  className="w-full h-64 p-4 border rounded-lg font-serif text-sm leading-relaxed"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Cláusulas do Contrato</label>
                <textarea 
                  value={clausesText}
                  onChange={e => setClausesText(e.target.value)}
                  className="w-full h-64 p-4 border rounded-lg font-serif text-sm leading-relaxed"
                />
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h1 className="text-xl font-bold uppercase underline">Proposta de Convênio Corporativo</h1>
              </div>

              <section>
                <h3 className="font-bold mb-2">1. Carta de Apresentação</h3>
                <div className="whitespace-pre-wrap">
                  {letterText.split(/(\*\*.*?\*\*)/g).map((part, i) => 
                    part.startsWith('**') && part.endsWith('**') ? 
                    <strong key={i}>{part.slice(2, -2)}</strong> : part
                  )}
                </div>
              </section>

              <hr className="my-8 border-slate-300" />

              <section>
                <h3 className="font-bold mb-4">2. Sugestão de Cláusulas para o Contrato de Convênio</h3>
                <div className="whitespace-pre-wrap">
                  {clausesText.split(/(\*\*.*?\*\*)/g).map((part, i) => 
                    part.startsWith('**') && part.endsWith('**') ? 
                    <strong key={i}>{part.slice(2, -2)}</strong> : part
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button 
            onClick={handleDownloadPDF}
            disabled={isEditing}
            className={`flex-1 p-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${isEditing ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
          >
            <Download size={20} /> Baixar PDF
          </button>
          <button 
            onClick={onClose}
            className="flex-1 bg-slate-200 text-slate-800 p-3 rounded-lg font-bold hover:bg-slate-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// Pix Helpers
const crc16 = (buffer: string) => {
  let crc = 0xFFFF;
  const length = buffer.length;
  for (let i = 0; i < length; i++) {
    crc ^= buffer.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc = crc << 1;
      }
    }
  }
  return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
};

const formatField = (id: string, value: string) => {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
};

const removeAccents = (str: string) => {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "").toUpperCase();
};

const generatePixPayload = (key: string, name: string, city: string, amount: string, txid: string = '***') => {
  const cleanKey = key.replace(/[^a-zA-Z0-9@.+]/g, ""); 
  const cleanAmount = parseFloat(amount).toFixed(2);
  const cleanName = removeAccents(name || 'Recebedor').substring(0, 25);
  const cleanCity = removeAccents(city || 'BRASIL').substring(0, 15);
  let cleanTxid = txid === '***' ? '***' : txid.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!cleanTxid) cleanTxid = '***';

  const payload = 
    formatField('00', '01') + 
    formatField('01', '12') + 
    formatField('26', 
      formatField('00', 'BR.GOV.BCB.PIX') +
      formatField('01', cleanKey)
    ) +
    formatField('52', '0000') + 
    formatField('53', '986') + 
    formatField('54', cleanAmount) + 
    formatField('58', 'BR') + 
    formatField('59', cleanName) + 
    formatField('60', cleanCity) + 
    formatField('62', 
       formatField('05', cleanTxid)
    ) + 
    '6304'; 

  return payload + crc16(payload);
};

// CorporateDebtDetailModal Component
const CorporateDebtDetailModal = ({ isOpen, onClose, company, customers, sales, clearCompanyDebt, settings }: {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  customers: Customer[];
  sales: Sale[];
  clearCompanyDebt: (id: string, discount: number, net: number) => Promise<void>;
  settings: any;
}) => {
  const { financialRecords } = useStore();
  const [showPixQR, setShowPixQR] = useState(false);
  const [pixPayload, setPixPayload] = useState('');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const companyCustomers = customers.filter(c => c.companyId === company.id);
  const totalDebt = companyCustomers.reduce((acc, c) => {
    const truePersonalDebt = financialRecords
        .filter(r => r.entityName === c.name && r.type === 'personal_receivable' && r.status !== 'paid')
        .reduce((sum, r) => sum + r.amount, 0);
    return acc + Math.max(0, c.debt - truePersonalDebt);
  }, 0);
  const discountPercent = company.corporateDiscount || 0;
  const discountAmount = totalDebt * (discountPercent / 100);
  const finalAmount = totalDebt - discountAmount;

  const companyCustomerIds = new Set(companyCustomers.map(c => c.id));
  const companySales = sales.filter(s => s.customerId && companyCustomerIds.has(s.customerId) && s.status === 'pending');

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);

    const addText = (text: string, fontSize = 10, isBold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, contentWidth);
      lines.forEach(line => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 6;
      });
    };

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DETALHADO DE DÍVIDA CORPORATIVA', pageWidth / 2, y, { align: 'center' });
    y += 15;

    addText(`Empresa: ${company.name}`, 12, true);
    addText(`CNPJ: ${company.cnpj}`);
    addText(`Data do Relatório: ${new Date().toLocaleString()}`);
    y += 5;

    addText('RESUMO FINANCEIRO', 11, true);
    addText(`Dívida Total Bruta: R$ ${totalDebt.toFixed(2)}`);
    addText(`Desconto Acordado (${discountPercent}%): R$ ${discountAmount.toFixed(2)}`);
    addText(`Total Líquido a Pagar: R$ ${finalAmount.toFixed(2)}`, 11, true);
    y += 10;

    addText('DETALHAMENTO POR COLABORADOR', 11, true);
    y += 5;

    companyCustomers.forEach(customer => {
      if (customer.debt > 0) {
        addText(`Colaborador: ${customer.name} - CPF: ${customer.cpf || 'N/A'}`, 10, true);
        addText(`Total Acumulado: R$ ${customer.debt.toFixed(2)}`);
        
        const customerSales = companySales.filter(s => s.customerId === customer.id);
        customerSales.forEach(sale => {
          addText(`  Venda ID: ${sale.id.slice(-6)} | Data: ${new Date(sale.date).toLocaleString()} | Método: ${sale.paymentMethod}`, 9);
          sale.items.forEach(item => {
            addText(`    - ${item.name} (${item.quantity}x) | Unit: R$ ${item.price.toFixed(2)} | Subtotal: R$ ${(item.price * item.quantity).toFixed(2)}`, 8);
          });
          addText(`    Total da Venda: R$ ${sale.total.toFixed(2)}`, 9, true);
          y += 2;
        });
        y += 5;
      }
    });

    doc.save(`Relatorio_Divida_${company.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleClearDebt = async () => {
    if (window.confirm(`Deseja realmente quitar a dívida total de R$ ${finalAmount.toFixed(2)} da empresa ${company.name}?`)) {
      handleDownloadPDF();
      await clearCompanyDebt(company.id, discountAmount, finalAmount);
      onClose();
    }
  };

  const handleGeneratePix = () => {
    if (!settings.pixKey) {
      alert('Chave Pix não configurada nas configurações da empresa.');
      return;
    }
    const payload = generatePixPayload(
      settings.pixKey,
      settings.name || 'Smart PDV PRO',
      'BRASIL',
      finalAmount.toString()
    );
    setPixPayload(payload);
    setShowPixQR(true);
  };

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Detalhes da Dívida - {company.name}</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-sm text-slate-500 font-bold uppercase">Dívida Bruta</p>
            <p className="text-2xl font-bold text-slate-800">R$ {totalDebt.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-sm text-indigo-600 font-bold uppercase">Desconto ({discountPercent}%)</p>
            <p className="text-2xl font-bold text-indigo-700">R$ {discountAmount.toFixed(2)}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-600 font-bold uppercase">Total Líquido</p>
            <p className="text-2xl font-bold text-green-700">R$ {finalAmount.toFixed(2)}</p>
          </div>
        </div>

        {showPixQR && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex flex-col items-center animate-in fade-in zoom-in duration-200">
            <h3 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
              <QrCode size={20} /> QR Code PIX para Pagamento
            </h3>
            <div className="bg-white p-3 rounded-xl shadow-sm mb-4">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixPayload)}`} 
                alt="QR Code Pix"
                className="w-40 h-40"
              />
            </div>
            <p className="text-xs text-blue-600 font-medium mb-4 text-center">
              Valor: <span className="font-bold text-lg">R$ {finalAmount.toFixed(2)}</span>
            </p>
            <div className="flex gap-2 w-full">
              <button 
                onClick={handleCopyPix}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all active:scale-95"
              >
                {copied ? <CheckCircle size={18} /> : <Copy size={18} />}
                {copied ? 'Copiado!' : 'Copiar Código PIX'}
              </button>
              <button 
                onClick={() => setShowPixQR(false)}
                className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition-all"
              >
                Ocultar
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {companyCustomers.filter(c => c.debt > 0).map(customer => (
            <div key={customer.id} className="border rounded-lg p-4 bg-slate-50">
              <div className="flex justify-between items-center mb-3 border-b pb-2">
                <div>
                  <h3 className="font-bold text-slate-800">{customer.name}</h3>
                  <p className="text-xs text-slate-500">CPF: {customer.cpf || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-500 uppercase">Total Gasto</p>
                  <p className="font-bold text-indigo-600">R$ {customer.debt.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                {companySales.filter(s => s.customerId === customer.id).map(sale => (
                  <div key={sale.id} className="bg-white p-3 rounded border border-slate-200 text-sm">
                    <div className="flex justify-between mb-2 text-xs text-slate-500 font-bold">
                      <span>ID: {sale.id.slice(-6)}</span>
                      <span>{new Date(sale.date).toLocaleString()}</span>
                      <span className="bg-slate-100 px-2 py-0.5 rounded uppercase">{sale.paymentMethod}</span>
                    </div>
                    <div className="space-y-1 mb-2">
                      {sale.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span>{item.quantity}x {item.name}</span>
                          <span className="text-slate-500">R$ {(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between border-t pt-2 font-bold text-slate-700">
                      <span>Total da Venda</span>
                      <span>R$ {sale.total.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button 
            onClick={handleClearDebt}
            className="flex-1 min-w-[150px] bg-green-600 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
          >
            <CheckCircle size={20} /> Quitar Dívida Total
          </button>
          <button 
            onClick={handleGeneratePix}
            className="flex-1 min-w-[150px] bg-indigo-600 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <QrCode size={20} /> Gerar PIX
          </button>
          <button 
            onClick={handleDownloadPDF}
            className="flex-1 min-w-[150px] bg-blue-600 text-white p-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <Download size={20} /> Baixar PDF
          </button>
          <button 
            onClick={onClose}
            className="flex-1 min-w-[150px] bg-slate-200 text-slate-800 p-3 rounded-lg font-bold hover:bg-slate-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// DebtModal Component
const DebtModal = ({ isOpen, onClose, company, customers, sales, clearCompanyDebt }: { 
  isOpen: boolean; 
  onClose: () => void; 
  company: Company; 
  customers: Customer[];
  sales: Sale[];
  clearCompanyDebt: (id: string, discount: number, net: number) => Promise<void>;
}) => {
  if (!isOpen) return null;

  const companyCustomers = customers.filter(c => c.companyId === company.id);
  const totalDebt = companyCustomers.reduce((acc, c) => acc + (c.debt - (c.personalDebt || 0)), 0);
  const discountPercent = company.corporateDiscount || 0;
  const discountAmount = totalDebt * (discountPercent / 100);
  const finalAmount = totalDebt - discountAmount;

  const companyCustomerIds = new Set(companyCustomers.map(c => c.id));
  const companySales = sales.filter(s => s.customerId && companyCustomerIds.has(s.customerId) && s.status === 'pending');

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);

    const addText = (text: string, fontSize = 10, isBold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, contentWidth);
      lines.forEach(line => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 6;
      });
    };

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DETALHADO DE DÍVIDA CORPORATIVA', pageWidth / 2, y, { align: 'center' });
    y += 15;

    addText(`Empresa: ${company.name}`, 12, true);
    addText(`CNPJ: ${company.cnpj}`);
    addText(`Data do Relatório: ${new Date().toLocaleString()}`);
    y += 5;

    addText('RESUMO FINANCEIRO', 11, true);
    addText(`Dívida Total Bruta: R$ ${totalDebt.toFixed(2)}`);
    addText(`Desconto Acordado (${discountPercent}%): R$ ${discountAmount.toFixed(2)}`);
    addText(`Total Líquido a Pagar: R$ ${finalAmount.toFixed(2)}`, 11, true);
    y += 10;

    addText('DETALHAMENTO POR COLABORADOR', 11, true);
    y += 5;

    companyCustomers.forEach(customer => {
      if (customer.debt > 0) {
        addText(`Colaborador: ${customer.name} - CPF: ${customer.cpf || 'N/A'}`, 10, true);
        addText(`Total Acumulado: R$ ${customer.debt.toFixed(2)}`);
        
        const customerSales = companySales.filter(s => s.customerId === customer.id);
        customerSales.forEach(sale => {
          addText(`  Venda ID: ${sale.id.slice(-6)} | Data: ${new Date(sale.date).toLocaleString()} | Método: ${sale.paymentMethod}`, 9);
          sale.items.forEach(item => {
            addText(`    - ${item.name} (${item.quantity}x) | Unit: R$ ${item.price.toFixed(2)} | Subtotal: R$ ${(item.price * item.quantity).toFixed(2)}`, 8);
          });
          addText(`    Total da Venda: R$ ${sale.total.toFixed(2)}`, 9, true);
          y += 2;
        });
        y += 5;
      }
    });

    doc.save(`Relatorio_Divida_${company.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleClearDebt = async () => {
    if (window.confirm(`Deseja realmente quitar a dívida total de R$ ${finalAmount.toFixed(2)} da empresa ${company.name}?`)) {
      handleDownloadPDF();
      await clearCompanyDebt(company.id, discountAmount, finalAmount);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Quitar Dívida - {company.name}</h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>
        
        <div className="grid grid-cols-1 gap-3 mb-6">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <p className="text-xs text-slate-500 font-bold uppercase">Dívida Bruta</p>
            <p className="text-lg font-bold">R$ {totalDebt.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded border border-indigo-200">
            <p className="text-xs text-indigo-600 font-bold uppercase">Desconto ({discountPercent}%)</p>
            <p className="text-lg font-bold text-indigo-700">R$ {discountAmount.toFixed(2)}</p>
          </div>
          <div className="p-3 bg-green-50 rounded border border-green-200">
            <p className="text-xs text-green-600 font-bold uppercase">Total Líquido</p>
            <p className="text-xl font-bold text-green-700">R$ {finalAmount.toFixed(2)}</p>
          </div>
        </div>
        
        <div className="flex gap-2 mb-6">
          <button onClick={handleDownloadPDF} className="flex-1 bg-slate-100 hover:bg-slate-200 p-2 rounded flex items-center justify-center gap-2 font-bold text-sm">
            <FileDown size={20} /> Baixar PDF Detalhado
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <button onClick={handleClearDebt} className="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded font-bold flex items-center justify-center gap-2">
            <CheckCircle size={20} /> Quitar Total e Baixar PDF
          </button>
          <button onClick={onClose} className="w-full bg-slate-200 text-slate-800 p-3 rounded font-bold">Cancelar</button>
        </div>
      </div>
    </div>
  );
};

// SettlementHistoryModal Component
const SettlementHistoryModal = ({ isOpen, onClose, company, settlements, removeDebtSettlement }: {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  settlements: DebtSettlement[];
  removeDebtSettlement: (id: string) => Promise<void>;
}) => {
  if (!isOpen) return null;

  const companySettlements = settlements.filter(s => s.companyId === company.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleReprint = (settlement: DebtSettlement) => {
    const doc = new jsPDF();
    const margin = 20;
    let y = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);

    const addText = (text: string, fontSize = 10, isBold = false) => {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', isBold ? 'bold' : 'normal');
      const lines = doc.splitTextToSize(text, contentWidth);
      lines.forEach(line => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 6;
      });
    };

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REIMPRESSÃO: RELATÓRIO DE QUITAÇÃO DE DÍVIDA', pageWidth / 2, y, { align: 'center' });
    y += 15;

    addText(`Empresa: ${settlement.companyName}`, 12, true);
    addText(`Data da Quitação: ${new Date(settlement.date).toLocaleString()}`);
    addText(`ID da Quitação: ${settlement.id}`);
    y += 5;

    addText('RESUMO FINANCEIRO', 11, true);
    addText(`Dívida Total Bruta: R$ ${settlement.totalAmount.toFixed(2)}`);
    addText(`Desconto Aplicado: R$ ${settlement.discountAmount.toFixed(2)}`);
    addText(`Total Líquido Pago: R$ ${settlement.netAmount.toFixed(2)}`, 11, true);
    y += 10;

    addText('DETALHAMENTO POR COLABORADOR', 11, true);
    y += 5;

    settlement.details.forEach(detail => {
      addText(`Colaborador: ${detail.customerName}`, 10, true);
      addText(`Valor Quitado: R$ ${detail.amount.toFixed(2)}`);
      
      detail.sales.forEach(sale => {
        addText(`  Venda ID: ${sale.saleId.slice(-6)} | Data: ${new Date(sale.date).toLocaleString()}`, 9);
        sale.items.forEach(item => {
          addText(`    - ${item.name} (${item.quantity}x) | Unit: R$ ${item.price.toFixed(2)} | Subtotal: R$ ${(item.price * item.quantity).toFixed(2)}`, 8);
        });
        addText(`    Total da Venda: R$ ${sale.total.toFixed(2)}`, 9, true);
        y += 2;
      });
      y += 5;
    });

    doc.save(`Recibo_Quitacao_${settlement.companyName.replace(/\s+/g, '_')}_${settlement.id}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <History className="text-indigo-600" /> Histórico de Quitações - {company.name}
          </h2>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3">
          {companySettlements.length > 0 ? (
            companySettlements.map(settlement => (
              <div key={settlement.id} className="p-4 border rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-bold text-slate-800">{new Date(settlement.date).toLocaleString()}</p>
                    <p className="text-xs text-slate-500">ID: {settlement.id}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">R$ {settlement.netAmount.toFixed(2)}</p>
                    <p className="text-xs text-slate-400">Bruto: R$ {settlement.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200">
                  <p className="text-xs text-slate-500 font-medium">
                    {settlement.customersCount} {settlement.customersCount === 1 ? 'colaborador' : 'colaboradores'} quitados
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleReprint(settlement)}
                      className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg flex items-center gap-1 text-xs font-bold"
                    >
                      <Download size={16} /> Reimprimir
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('Deseja realmente remover este registro de quitação? Isso não reverterá as dívidas dos clientes.')) {
                          removeDebtSettlement(settlement.id);
                        }
                      }}
                      className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-slate-400">
              <History size={48} className="mx-auto mb-4 opacity-20" />
              <p>Nenhuma quitação registrada para esta empresa.</p>
            </div>
          )}
        </div>

        <div className="mt-6">
          <button onClick={onClose} className="w-full bg-slate-200 text-slate-800 p-3 rounded-lg font-bold hover:bg-slate-300">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export const Companies = () => {
  const { companies, addCompany, updateCompany, removeCompany, customers, clearCustomerDebt, clearCompanyDebt, settings, currentUser, sales, debtSettlements, removeDebtSettlement, financialRecords } = useStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewingCustomersCompany, setViewingCustomersCompany] = useState<Company | null>(null);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void} | null>(null);
  const [debtModalCompany, setDebtModalCompany] = useState<Company | null>(null);
  const [presentationLetterCompany, setPresentationLetterCompany] = useState<Company | null>(null);
  const [corporateDebtDetailCompany, setCorporateDebtDetailCompany] = useState<Company | null>(null);
  const [settlementHistoryCompany, setSettlementHistoryCompany] = useState<Company | null>(null);
  
  // Search and Filter States
  const [companySearchTerm, setCompanySearchTerm] = useState('');
  const [debtFilter, setDebtFilter] = useState<'all' | 'pending' | 'upToDate'>('all');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [creditFilter, setCreditFilter] = useState<'all' | 'withCredit' | 'withoutCredit'>('all');

  const [formData, setFormData] = useState<Partial<Company>>({
    name: '',
    tradeName: '',
    cnpj: '',
    stateRegistration: 'isento',
    address: { street: '', number: '', city: '', state: '' },
    contact: { phone: '', email: '' },
    description: '',
    corporateDiscount: 20,
    paymentMethods: {
      pix: true,
      money: true,
      credit: true,
      debit: true,
      term: { enabled: false, maxInstallments: 3 }
    },
    creditLimit: 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCompany) {
      updateCompany({ ...editingCompany, ...formData } as Company);
    } else {
      addCompany({ ...formData, id: Date.now().toString() } as Company);
    }
    setIsFormOpen(false);
    setEditingCompany(null);
    setFormData({
      name: '',
      tradeName: '',
      cnpj: '',
      stateRegistration: 'isento',
      address: { street: '', number: '', city: '', state: '' },
      contact: { phone: '', email: '' },
      description: '',
      corporateDiscount: 20,
      paymentMethods: {
        pix: true,
        money: true,
        credit: true,
        debit: true,
        term: { enabled: false, maxInstallments: 3 }
      },
      creditLimit: 0
    });
  };

  return (
    <PlanGate>
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Building className="text-blue-600" /> Empresas
        </h1>
        <button 
          onClick={() => { setEditingCompany(null); setIsFormOpen(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} /> Nova Empresa
        </button>
      </div>

      <div className="flex gap-4 mb-6">
        <input 
          type="text" 
          placeholder="Pesquisar empresa..." 
          value={companySearchTerm} 
          onChange={e => setCompanySearchTerm(e.target.value)} 
          className="p-2 border rounded-lg flex-1"
        />
        <select value={debtFilter} onChange={e => setDebtFilter(e.target.value as any)} className="p-2 border rounded-lg">
          <option value="all">Todas</option>
          <option value="pending">Dívidas Pendentes</option>
          <option value="upToDate">Em Dia</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.filter(company => {
          const companyCustomers = customers.filter(c => c.companyId === company.id);
          const totalDebt = companyCustomers.reduce((acc, c) => acc + c.debt, 0);
          const matchesSearch = company.name.toLowerCase().includes(companySearchTerm.toLowerCase());
          const matchesDebt = debtFilter === 'all' || (debtFilter === 'pending' ? totalDebt > 0 : totalDebt === 0);
          return matchesSearch && matchesDebt;
        }).map(company => (
          <div key={company.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-slate-800">{company.name}</h3>
                <p className="text-sm text-slate-500">{company.tradeName}</p>
              </div>
              {company.contact.phone && (
                <a href={`https://wa.me/${company.contact.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-500 hover:text-green-600">
                  <MessageCircle size={24} />
                </a>
              )}
            </div>
            <div className="mt-4 text-sm text-slate-600 space-y-1">
              <p>CNPJ: {company.cnpj}</p>
              <p>IE: {company.stateRegistration}</p>
              <p>Endereço: {company.address.street}, {company.address.number}</p>
              <p>Cidade: {company.address.city} - {company.address.state}</p>
              <p>Email: {company.contact.email}</p>
              <p>Limite de Crédito: R$ {(typeof company.creditLimit === 'number' ? company.creditLimit : 0).toFixed(2)}</p>
            </div>
            <div className="mt-6 flex gap-2">
              <button 
                onClick={() => setViewingCustomersCompany(company)}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                title="Ver Clientes"
              >
                <Users size={18} />
              </button>
              <button 
                onClick={() => setCorporateDebtDetailCompany(company)}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                title="Ver Detalhes da Dívida"
              >
                <Eye size={18} />
              </button>
              <button 
                onClick={() => setDebtModalCompany(company)}
                className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                title="Quitar Toda Dívida"
              >
                <DollarSign size={18} />
              </button>
              <button 
                onClick={() => setPresentationLetterCompany(company)}
                className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg"
                title="Gerar Carta de Apresentação"
              >
                <FileText size={18} />
              </button>
              <button 
                onClick={() => setSettlementHistoryCompany(company)}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-1"
                title="Histórico de Quitações"
              >
                <History size={18} />
                {debtSettlements.filter(s => s.companyId === company.id).length > 0 && (
                  <span className="text-[10px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">
                    R$ {debtSettlements.filter(s => s.companyId === company.id).reduce((acc, s) => acc + s.netAmount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                )}
              </button>
              <button 
                onClick={() => { setEditingCompany(company); setFormData(company); setIsFormOpen(true); }}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
              >
                <Pencil size={18} />
              </button>
              <button 
                onClick={() => setConfirmConfig({
                  isOpen: true,
                  title: 'Remover Empresa',
                  message: `Tem certeza que deseja remover a empresa ${company.name}?`,
                  onConfirm: () => { removeCompany(company.id); setConfirmConfig(null); }
                })}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {viewingCustomersCompany && (() => {
        const companyCustomers = customers.filter(c => c.companyId === viewingCustomersCompany.id);
        const totalDebt = companyCustomers.reduce((acc, c) => {
            const truePersonalDebt = financialRecords
                .filter(r => r.entityName === c.name && r.type === 'personal_receivable' && r.status !== 'paid')
                .reduce((sum, r) => sum + r.amount, 0);
            return acc + Math.max(0, c.debt - truePersonalDebt);
        }, 0);
        const totalCredit = companyCustomers.reduce((acc, c) => {
            const truePersonalDebt = financialRecords
                .filter(r => r.entityName === c.name && r.type === 'personal_receivable' && r.status !== 'paid')
                .reduce((sum, r) => sum + r.amount, 0);
            return acc + (viewingCustomersCompany.creditLimit - Math.max(0, c.debt - truePersonalDebt));
        }, 0);

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="text-blue-600" /> Clientes - {viewingCustomersCompany.name}
                </h2>
                <div className="flex gap-4">
                  <p className="text-sm font-bold text-blue-800">Dívida Empresa: R$ {totalDebt.toFixed(2)}</p>
                  <p className="text-sm font-bold text-emerald-800">Crédito Disponível: R$ {totalCredit.toFixed(2)}</p>
                </div>
                <button onClick={() => { setViewingCustomersCompany(null); setCustomerSearchTerm(''); setCreditFilter('all'); }}><X size={24} /></button>
              </div>
              
              {(() => {
                const filteredCustomers = companyCustomers.filter(c => {
                  const truePersonalDebt = financialRecords
                      .filter(r => r.entityName === c.name && r.type === 'personal_receivable' && r.status !== 'paid')
                      .reduce((sum, r) => sum + r.amount, 0);
                  const matchesSearch = c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) || 
                                        c.cpf?.includes(customerSearchTerm) || 
                                        c.employeeId?.includes(customerSearchTerm) || 
                                        c.loyaltyCardNumber?.includes(customerSearchTerm);
                  const companyDebt = Math.max(0, c.debt - truePersonalDebt);
                  const credit = viewingCustomersCompany.creditLimit - companyDebt;
                  const matchesCredit = creditFilter === 'all' || (creditFilter === 'withCredit' ? credit > 0 : credit <= 0);
                  return matchesSearch && matchesCredit;
                });

                return (
                  <>
                    <div className="flex gap-2 mb-4">
                      <input 
                        type="text" 
                        placeholder="Pesquisar cliente (nome, cpf, matrícula, cartão)..." 
                        value={customerSearchTerm} 
                        onChange={e => setCustomerSearchTerm(e.target.value)} 
                        className="p-2 border rounded-lg flex-1"
                      />
                      <select value={creditFilter} onChange={e => setCreditFilter(e.target.value as any)} className="p-2 border rounded-lg">
                        <option value="all">Todos</option>
                        <option value="withCredit">Com Crédito</option>
                        <option value="withoutCredit">Sem Crédito</option>
                      </select>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {filteredCustomers.length > 0 ? (
                        <div className="space-y-2">
                          {filteredCustomers.map(customer => {
                            const truePersonalDebt = financialRecords
                                .filter(r => r.entityName === customer.name && r.type === 'personal_receivable' && r.status !== 'paid')
                                .reduce((sum, r) => sum + r.amount, 0);
                            const companyDebt = Math.max(0, customer.debt - truePersonalDebt);
                            return (
                            <div key={customer.id} className="p-3 border rounded-lg flex justify-between items-center bg-slate-50">
                              <div>
                                <p className="font-medium text-slate-800">{customer.name}</p>
                                <p className="text-xs text-slate-500">CPF: {customer.cpf || 'N/A'} | Matrícula: {customer.employeeId || 'N/A'} | Cartão: {customer.loyaltyCardNumber || 'N/A'}</p>
                              </div>
                              <div className="text-right flex items-center gap-3">
                                <div>
                                  <p className="text-xs font-bold text-blue-600">Dívida Empresa: R$ {companyDebt.toFixed(2)}</p>
                                  <p className="text-xs font-bold text-emerald-600">Crédito: R$ {(viewingCustomersCompany.creditLimit - companyDebt).toFixed(2)}</p>
                                  {truePersonalDebt > 0 ? (
                                    <p className="text-[10px] font-medium text-orange-600">Dívida Pessoal: R$ {truePersonalDebt.toFixed(2)}</p>
                                  ) : null}
                                </div>
                                {customer.debt > 0 && (
                                  <button 
                                    onClick={() => setConfirmConfig({
                                      isOpen: true,
                                      title: 'Quitar Dívida',
                                      message: `Deseja quitar a dívida total de R$ ${customer.debt.toFixed(2)} do cliente ${customer.name}?`,
                                      onConfirm: () => { clearCustomerDebt(customer.id); setConfirmConfig(null); }
                                    })}
                                    className="p-1.5 text-green-600 hover:bg-green-100 rounded-full transition-colors"
                                    title="Quitar Dívida Total"
                                  >
                                    <CheckCircle size={18} />
                                  </button>
                                )}
                              </div>
                            </div>
                          )})}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-slate-500">
                          Nenhum cliente encontrado.
                        </div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{editingCompany ? 'Editar Empresa' : 'Nova Empresa'}</h2>
              <button onClick={() => setIsFormOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Nome" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="p-2 border rounded" required />
              <input type="text" placeholder="Nome Fantasia" value={formData.tradeName} onChange={e => setFormData({...formData, tradeName: e.target.value})} className="p-2 border rounded" />
              <input type="text" placeholder="CNPJ" value={formData.cnpj} onChange={e => setFormData({...formData, cnpj: e.target.value})} className="p-2 border rounded" />
              <input type="text" placeholder="Inscrição Estadual" value={formData.stateRegistration} onChange={e => setFormData({...formData, stateRegistration: e.target.value})} className="p-2 border rounded" />
              <input type="text" placeholder="Rua" value={formData.address?.street} onChange={e => setFormData({...formData, address: {...formData.address!, street: e.target.value}})} className="p-2 border rounded" />
              <input type="text" placeholder="Número" value={formData.address?.number} onChange={e => setFormData({...formData, address: {...formData.address!, number: e.target.value}})} className="p-2 border rounded" />
              <input type="text" placeholder="Cidade" value={formData.address?.city} onChange={e => setFormData({...formData, address: {...formData.address!, city: e.target.value}})} className="p-2 border rounded" />
              <input type="text" placeholder="Estado" value={formData.address?.state} onChange={e => setFormData({...formData, address: {...formData.address!, state: e.target.value}})} className="p-2 border rounded" />
              <input type="text" placeholder="Telefone" value={formData.contact?.phone} onChange={e => setFormData({...formData, contact: {...formData.contact!, phone: e.target.value}})} className="p-2 border rounded" />
              <input type="email" placeholder="Email" value={formData.contact?.email} onChange={e => setFormData({...formData, contact: {...formData.contact!, email: e.target.value}})} className="p-2 border rounded" />
              <input type="number" placeholder="Limite de Crédito (R$)" value={formData.creditLimit} onChange={e => setFormData({...formData, creditLimit: parseFloat(e.target.value)})} className="p-2 border rounded" />
              <textarea placeholder="Descrição" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="p-2 border rounded md:col-span-2" />
              
              <div className="md:col-span-2 space-y-2">
                <h3 className="font-bold">Métodos de Pagamento</h3>
                <div className="flex gap-4 flex-wrap">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={formData.paymentMethods?.pix} onChange={e => setFormData({...formData, paymentMethods: {...formData.paymentMethods!, pix: e.target.checked}})} /> Pix</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={formData.paymentMethods?.money} onChange={e => setFormData({...formData, paymentMethods: {...formData.paymentMethods!, money: e.target.checked}})} /> Dinheiro</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={formData.paymentMethods?.credit} onChange={e => setFormData({...formData, paymentMethods: {...formData.paymentMethods!, credit: e.target.checked}})} /> Crédito</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={formData.paymentMethods?.debit} onChange={e => setFormData({...formData, paymentMethods: {...formData.paymentMethods!, debit: e.target.checked}})} /> Débito</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={formData.paymentMethods?.term.enabled} onChange={e => setFormData({...formData, paymentMethods: {...formData.paymentMethods!, term: {...formData.paymentMethods!.term, enabled: e.target.checked}}})} /> A Prazo</label>
                </div>
                {formData.paymentMethods?.term.enabled && (
                  <div className="flex gap-2">
                    <input type="number" placeholder="Máx. Parcelas" value={formData.paymentMethods?.term.maxInstallments} onChange={e => setFormData({...formData, paymentMethods: {...formData.paymentMethods!, term: {...formData.paymentMethods!.term, maxInstallments: parseInt(e.target.value)}}})} className="p-2 border rounded w-full" />
                    <div className="relative w-full">
                      <input type="number" placeholder="Desconto Empresa (%)" value={formData.corporateDiscount} onChange={e => setFormData({...formData, corporateDiscount: parseFloat(e.target.value)})} className="p-2 border rounded w-full pr-8" />
                      <span className="absolute right-3 top-2 text-slate-400">%</span>
                    </div>
                  </div>
                )}
              </div>
              
              <button type="submit" className="md:col-span-2 bg-blue-600 text-white p-2 rounded flex items-center justify-center gap-2">
                <Save size={20} /> Salvar
              </button>
            </form>
          </div>
        </div>
      )}

      {presentationLetterCompany && (
        <PresentationLetterModal 
          key={presentationLetterCompany.id}
          isOpen={!!presentationLetterCompany}
          onClose={() => setPresentationLetterCompany(null)}
          company={presentationLetterCompany}
          settings={settings}
          currentUser={currentUser}
          onUpdate={updateCompany}
        />
      )}

      {corporateDebtDetailCompany && (
        <CorporateDebtDetailModal 
          isOpen={!!corporateDebtDetailCompany}
          onClose={() => setCorporateDebtDetailCompany(null)}
          company={corporateDebtDetailCompany}
          customers={customers}
          sales={sales}
          clearCompanyDebt={clearCompanyDebt}
          settings={settings}
        />
      )}

      {debtModalCompany && (
        <DebtModal 
          isOpen={!!debtModalCompany} 
          onClose={() => setDebtModalCompany(null)} 
          company={debtModalCompany} 
          customers={customers} 
          sales={sales}
          clearCompanyDebt={clearCompanyDebt}
        />
      )}

      {settlementHistoryCompany && (
        <SettlementHistoryModal 
          isOpen={!!settlementHistoryCompany}
          onClose={() => setSettlementHistoryCompany(null)}
          company={settlementHistoryCompany}
          settlements={debtSettlements}
          removeDebtSettlement={removeDebtSettlement}
        />
      )}
      
      {confirmConfig && (
        <ConfirmModal 
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          onConfirm={confirmConfig.onConfirm}
          onCancel={() => setConfirmConfig(null)}
        />
      )}
    </div>
    </PlanGate>
  );
};
