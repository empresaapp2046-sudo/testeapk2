// @ts-nocheck

import { Sale, CompanySettings, Customer, FinancialRecord, PaymentMethod, Company, RaffleCampaign } from "../types";
// @ts-expect-error - No types available for html2canvas in this environment
import html2canvas from "html2canvas";

export const generateReceiptContent = (sale: Sale, settings: CompanySettings, customer?: Customer, financialRecords?: FinancialRecord[], companies?: Company[], raffleCampaigns?: RaffleCampaign[]) => {
  const width = settings.printerConfig.paperWidth === '58mm' ? '58mm' : '80mm';
  const dateObj = new Date(sale.date);
  const dateStr = dateObj.toLocaleDateString('pt-BR');
  const timeStr = dateObj.toLocaleTimeString('pt-BR');
  
  const totalItems = sale.items.reduce((acc, item) => acc + item.quantity, 0);

  // Find Raffle Campaign information if applicable
  const campaign = raffleCampaigns?.find(c => c.id === sale.raffleCampaignId);
  const campaignTitle = campaign ? campaign.title : 'SORTEIO DA LOJA';
  const campaignPrize = campaign ? campaign.prize : '';

  // Determine Customer Name to Display
  let customerName = 'Venda Avulsa';
  let customerCpf = '';
  let companyInfo = '';
  
  if (sale.unregisteredCustomer) {
      customerName = sale.unregisteredCustomer.name;
      const cpfHtml = sale.unregisteredCustomer.cpf ? `<div><strong>CPF:</strong> ${sale.unregisteredCustomer.cpf}</div>` : '';
      const phoneHtml = sale.unregisteredCustomer.phone ? `<div><strong>Tel:</strong> ${sale.unregisteredCustomer.phone}</div>` : '';
      customerCpf = `${cpfHtml}${phoneHtml}`;
  } else if (customer && customer.id !== 'def') {
      customerName = customer.name;
      customerCpf = customer.cpf ? `<div><strong>CPF:</strong> ${customer.cpf}</div>` : '';
      
      if (customer.companyId && companies) {
          const company = companies.find(c => c.id === customer.companyId);
          if (company) {
              companyInfo = `
                <div style="border-bottom: 1px dashed #000; margin-bottom: 5px;"></div>
                <div style="margin-bottom: 5px;">
                    <div><strong>Empresa:</strong> ${company.name}</div>
                    <div><strong>Matrícula:</strong> ${customer.employeeId || 'N/A'}</div>
                    <div><strong>Cartão:</strong> ${customer.loyaltyCardNumber || 'N/A'}</div>
                    <div style="font-weight: bold; margin-top: 2px;">Crediário</div>
                </div>
              `;
          }
      }
  }

  // Clone and sort records to match payments in order (Oldest due date first)
  // This helps when multiple installments have same amount but different dates
  const availableRecords = financialRecords 
      ? [...financialRecords].filter(r => r.documentNumber === sale.id || r.description.includes(`Venda #${sale.id}`)).sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) 
      : [];

  // Helper to generate row text
  const getPaymentRowInfo = (payment: any, index: number) => {
      let methodText = payment.method.toString();
      if (payment.method === 'A Prazo') {
          if (payment.totalInstallments && payment.totalInstallments > 1) {
              methodText = `A Prazo (${payment.installmentNumber}/${payment.totalInstallments})`;
          } else {
              methodText = `A Prazo`;
          }
      } else if (payment.method === 'Crédito') {
          if (payment.totalInstallments && payment.totalInstallments > 1) {
              methodText = `Crédito (${payment.totalInstallments}x)`;
          }
      }

      if (payment.interestRate && payment.interestRate > 0) {
          const installmentsCount = payment.totalInstallments || 1;
          const individualRate = payment.interestRate / installmentsCount;
          methodText += ` (+${individualRate.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}% Juros: R$ ${payment.interestAmount?.toFixed(2)})`;
      }

      // If NOT "A Prazo", it is considered paid at the moment of sale
      if (payment.method !== 'A Prazo') {
          return {
              text: `${methodText} - Pago - ${dateStr}`,
              amount: payment.amount,
              paidAmount: payment.amount,
              debtAmount: 0
          };
      }

      // FIND MATCHING FINANCIAL RECORD
      // We look for a record with similar amount and matching due date (if present)
      // If payment has no due date (legacy), we take the first available record with matching amount
      const pDate = payment.dueDate ? new Date(payment.dueDate).toISOString().split('T')[0] : null;
      
      const recordIndex = availableRecords.findIndex(r => {
          const rDate = new Date(r.dueDate).toISOString().split('T')[0];
          // Tolerance for float precision issues
          const amtMatch = Math.abs(r.originalAmount - payment.amount) < 0.05;
          
          if (pDate) {
              return amtMatch && rDate === pDate;
          }
          return amtMatch;
      });

      let statusSuffix: string;

      let match: any = null;
      if (recordIndex !== -1) {
          match = availableRecords[recordIndex];
          // Remove from pool so next payment doesn't grab it
          availableRecords.splice(recordIndex, 1);

          const dueDateObj = new Date(match.dueDate);
          const dueDateStr = dueDateObj.toLocaleDateString('pt-BR');
          const today = new Date();
          today.setHours(0,0,0,0);
          dueDateObj.setHours(0,0,0,0);

          if (match.status === 'paid') {
              let payDate = dueDateStr;
              let payMethod = '';
              if (match.history && match.history.length > 0) {
                  const lastH = match.history[match.history.length - 1];
                  payDate = new Date(lastH.date).toLocaleDateString('pt-BR');
                  const m = lastH.note?.match(/Pagamento Realizado \((.*?)\)/);
                  if (m && m[1]) payMethod = ` - ${m[1]}`;
              }
              statusSuffix = ` - Pago${payMethod} - ${payDate}`;
          } else if (match.status === 'partial') {
              const paidAmount = (match.history || []).reduce((acc: number, h: any) => acc + h.amount, 0);
              let payDate = '';
              let payMethod = '';
              if (match.history && match.history.length > 0) {
                  const lastH = match.history[match.history.length - 1];
                  payDate = ` em ${new Date(lastH.date).toLocaleDateString('pt-BR')}`;
                  const m = lastH.note?.match(/Pagamento Realizado \((.*?)\)/);
                  if (m && m[1]) payMethod = ` (${m[1]})`;
              }
              const remainingAmount = match.amount;
              statusSuffix = ` - Pago Parcial R$ ${paidAmount.toFixed(2)}${payMethod}${payDate} (Resta R$ ${remainingAmount.toFixed(2)})`;
          } else {
              // Calculate Days Difference
              const diffTime = dueDateObj.getTime() - today.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

              if (diffDays < 0) {
                  statusSuffix = ` - Vencido - ${dueDateStr}`;
              } else if (diffDays === 0) {
                  statusSuffix = ` - Vencendo Hoje`;
              } else if (diffDays === 1) {
                  statusSuffix = ` - Vence Amanhã`;
              } else {
                  statusSuffix = ` - Vence - ${dueDateStr}`;
              }
          }
      } else {
          // Fallback if no matching record is found in state but it's A Prazo
          if (payment.method === 'A Prazo' && payment.dueDate) {
              const dVal = payment.dueDate;
              if (dVal.length === 10 && dVal.includes('-')) {
                  const [y, m, d] = dVal.split('-').map(Number);
                  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
                  statusSuffix = ` - Vence - ${date.toLocaleDateString('pt-BR')}`;
              } else {
                  statusSuffix = ` - Vence - ${new Date(dVal).toLocaleDateString('pt-BR')}`;
              }
          } else {
              statusSuffix = ""; 
          }
      }

      let paidAmt = 0;
      let debtAmt = 0;
      if (payment.method !== 'A Prazo') {
          paidAmt = payment.amount;
      } else if (typeof match !== 'undefined' && match) {
          if (match.status === 'paid') {
              paidAmt = payment.amount;
          } else if (match.status === 'partial') {
              paidAmt = (match.history || []).reduce((acc: number, h: any) => acc + h.amount, 0);
              debtAmt = match.amount; // remaining
          } else {
              debtAmt = payment.amount;
          }
      } else if (payment.method === 'A Prazo') {
          debtAmt = payment.amount;
      }
      return {
          text: `${methodText}${statusSuffix}`,
          amount: payment.amount,
          paidAmount: paidAmt,
          debtAmount: debtAmt
      };
  };

  // Parse Payments for display
  let calculatedPaid = 0;
  let calculatedDebt = 0;
  const paymentRows = sale.payments.map((p, idx) => {
    const info = getPaymentRowInfo(p, idx);
    calculatedPaid += info.paidAmount;
    calculatedDebt += info.debtAmount;
    return `
      <div style="margin-bottom: 3px; border-bottom: 1px dotted #eee; padding-bottom: 2px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <span style="flex: 1; padding-right: 5px;">${info.text}</span>
            <span style="white-space: nowrap; margin-left: 8px;">R$ ${info.amount.toFixed(2)}</span>
        </div>
      </div>
    `;
  }).join('');

  const totalPaid = calculatedPaid;
  const change = Math.max(0, calculatedPaid - sale.total);

  return `
    <div id="receipt-content" style="width: ${width}; font-family: 'Courier New', Courier, monospace; font-size: ${settings.receiptFontSize || 11}px; font-weight: ${settings.receiptFontWeight || 'normal'}; line-height: 1.2; color: #000; background: #fff; padding: 10px; margin: 0 auto;">
      <div style="text-align: center; margin-bottom: 10px;">
        <h2 style="font-size: 14px; font-weight: bold; margin: 0;">${settings.name}</h2>
        ${settings.cnpj ? `<div>CNPJ: ${settings.cnpj}</div>` : ''}
        ${settings.phone ? `<div>Tel: ${settings.phone}</div>` : ''}
        <div style="margin-top: 5px;">${dateStr} - ${timeStr}</div>
      </div>

      <div style="border-bottom: 1px dashed #000; margin-bottom: 5px;"></div>
      
      <div style="margin-bottom: 5px;">
        <div><strong>Cliente:</strong> ${customerName}</div>
        ${customerCpf}
      </div>
      ${companyInfo}

      <div style="border-bottom: 1px dashed #000; margin-bottom: 5px;"></div>

      <div style="margin-bottom: 5px;">
        <div style="display: flex; font-weight: bold; margin-bottom: 2px;">
           <span style="flex: 1;">Item</span>
           <span style="width: 30px; text-align: center;">Qtd</span>
           <span style="width: 60px; text-align: right;">Vl.Tot</span>
        </div>
        ${sale.items.map(item => {
          const itemTotal = item.price * item.quantity;
          const itemDiscount = item.isDiscountActive 
            ? (item.discountType === '%' ? (itemTotal * (item.discountValue || 0) / 100) : ((item.discountValue || 0) * item.quantity))
            : 0;
          return `
          <div style="display: flex; margin-bottom: 2px;">
            <span style="flex: 1;">${item.name}</span>
            <span style="width: 30px; text-align: center;">${item.quantity}</span>
            <span style="width: 60px; text-align: right;">${itemTotal.toFixed(2)}</span>
          </div>
          <div style="font-size: 9px; color: #555;">(Unit: R$ ${item.price.toFixed(2)})</div>
          ${itemDiscount > 0 ? `
          <div style="display: flex; font-size: 9px; color: #555; margin-bottom: 2px;">
            <span style="flex: 1;">Desconto item:</span>
            <span style="width: 60px; text-align: right;">-R$ ${itemDiscount.toFixed(2)}</span>
          </div>
          ` : ''}
        `}).join('')}
      </div>

      <div style="border-bottom: 1px dashed #000; margin: 5px 0;"></div>

      <div style="display: flex; justify-content: space-between;">
        <span>Qtd. Total Itens:</span>
        <span>${totalItems}</span>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-top: 2px;">
        <span>Subtotal:</span>
        <span>R$ ${(sale.total - (sale.interestTotal || 0) + (sale.discountTotal || 0)).toFixed(2)}</span>
      </div>

      ${(sale.discountTotal || 0) > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-top: 2px;">
        <span>Descontos:</span>
        <span>-R$ ${sale.discountTotal?.toFixed(2)}</span>
      </div>
      ` : ''}

      ${(sale.interestTotal || 0) > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-top: 2px;">
        <span>Juros:</span>
        <span>R$ ${sale.interestTotal?.toFixed(2)}</span>
      </div>
      ` : ''}
      <div style="display: flex; justify-content: space-between; font-size: 14px; margin-top: 5px;">
        <strong>TOTAL:</strong>
        <strong>R$ ${sale.total.toFixed(2)}</strong>
      </div>

      <div style="border-bottom: 1px dashed #000; margin: 5px 0;"></div>

      <div style="margin-bottom: 10px;">
        <div style="font-weight: bold; margin-bottom: 4px;">Formas de Pagamento:</div>
        ${paymentRows}
      </div>

      ${calculatedDebt > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-top: 5px; font-weight: bold;">
        <span>Valor Devedor:</span>
        <span>R$ ${calculatedDebt.toFixed(2)}</span>
      </div>` : ''}
      <div style="display: flex; justify-content: space-between; margin-top: 2px;">
        <span>Valor Pago:</span>
        <span>R$ ${totalPaid.toFixed(2)}</span>
      </div>

      ${change > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-top: 2px;">
        <span>Troco:</span>
        <span>R$ ${change.toFixed(2)}</span>
      </div>
      ` : ''}

      <div style="text-align: center; margin-top: 15px; font-size: 10px;">
        <div>Agradecemos a preferência!</div>
        <div style="font-weight: bold; margin-top: 2px;">${settings.name}</div>
      </div>

      ${sale.raffleCoupons && sale.raffleCoupons.length > 0 ? (() => {
        const rawName = customer?.name || sale.unregisteredCustomer?.name || '';
        const isRegistered = customer && customer.id !== 'def' && rawName && !rawName.toLowerCase().includes('balcão') && !rawName.toLowerCase().includes('balcao') && !rawName.toLowerCase().includes('avulsa');
        const shouldFill = isRegistered && (settings.printerConfig?.fillCustomerOnRaffleCoupon !== false);

        const cName = shouldFill ? rawName : '';
        const cPhone = shouldFill ? (customer?.phone || sale.unregisteredCustomer?.phone || '') : '';
        const cCity = shouldFill ? (customer?.city || '') : '';
        const cBairro = shouldFill ? (customer?.apartment || '') : '';
        const cStreet = shouldFill ? (customer?.street ? `${customer.street}${customer.number ? ', ' + customer.number : ''}` : '') : '';

        return `
        <!-- Separador / Linha de Corte -->
        <div style="text-align: center; font-weight: bold; margin: 20px 0 10px 0; font-size: 10px; border-top: 2px dashed #000; padding-top: 10px;">
          [ - - - Corte Aqui - - - ]
        </div>

        <div style="text-align: center; margin-bottom: 12px;">
          ${settings.logoUrl ? `<img src="${settings.logoUrl}" style="max-height: 40px; max-width: 140px; margin: 0 auto 6px auto; display: block; object-fit: contain;" />` : ''}
          <div style="font-weight: bold; font-size: 12px; text-transform: uppercase;">${settings.name || 'Nossa Loja'}</div>
          ${settings.phone ? `<div style="font-size: 9px; color: #444; margin-bottom: 4px;">Tel: ${settings.phone}</div>` : ''}
          <div style="font-weight: bold; font-size: 13px; margin-top: 6px;">CUPOM DE SORTEIO</div>
          ${campaignTitle ? `<div style="font-weight: bold; font-size: 11px; margin-top: 2px;">${campaignTitle}</div>` : ''}
          ${campaignPrize ? `<div style="font-size: 10px; margin-top: 2px;">Prêmio: ${campaignPrize}</div>` : ''}
          <div style="font-size: 9px; margin-top: 3px; color: #333;">Preencha e deposite na urna!</div>
        </div>

        ${sale.raffleCoupons.map((coupon, i) => `
        <div style="border: 1px solid #000; padding: 10px; margin-bottom: 15px; font-family: monospace; font-size: 10px; border-radius: 4px; background: #fff;">
          <div style="text-align: center; font-size: 15px; font-weight: bold; margin-bottom: 10px; padding: 4px; background: #f0f0f0; border-bottom: 1px solid #ccc;">
            CUPOM Nº: ${coupon}
          </div>
          <div style="margin-bottom: 8px; font-size: 10px;">
            <strong>Nome:</strong> ${cName ? `<span style="font-weight: bold;">${cName}</span>` : '___________________________________'}
          </div>
          <div style="margin-bottom: 8px; font-size: 10px;">
            <strong>Telefone:</strong> ${cPhone ? `<span>${cPhone}</span>` : '___________________________________'}
          </div>
          <div style="margin-bottom: 8px; font-size: 10px;">
            <strong>Cidade:</strong> ${cCity ? `<span>${cCity}</span>` : '___________________________________'}
          </div>
          <div style="margin-bottom: 8px; font-size: 10px;">
            <strong>Bairro:</strong> ${cBairro ? `<span>${cBairro}</span>` : '___________________________________'}
          </div>
          <div style="margin-bottom: 4px; font-size: 10px;">
            <strong>Rua:</strong> ${cStreet ? `<span>${cStreet}</span>` : '___________________________________'}
          </div>
        </div>
        `).join('')}
        `;
      })() : ''}
    </div>
  `;
};

// Generates receipt HTML for a single coupon (reprint / custom)
export const generateSingleCouponReceiptContent = (
  couponNumber: string,
  campaignTitle: string,
  campaignPrize: string,
  settings: CompanySettings,
  customerData?: {
    name?: string;
    phone?: string;
    city?: string;
    bairro?: string;
    street?: string;
  },
  options?: {
    isReprint?: boolean;
    isInvalid?: boolean;
    fillCustomerName?: boolean;
  }
) => {
  const paperWidth = settings.printerConfig?.paperWidth || '80mm';
  const logoUrl = settings.logo || settings.logoUrl;
  const isInvalid = options?.isInvalid;
  const isReprint = options?.isReprint;

  const rawName = customerData?.name || '';
  const isRegistered = rawName && !rawName.toLowerCase().includes('balcão') && !rawName.toLowerCase().includes('balcao') && !rawName.toLowerCase().includes('avulsa');
  const nameToPrint = (options?.fillCustomerName !== false && isRegistered) ? rawName : '';

  const phoneToPrint = nameToPrint ? (customerData?.phone || '') : '';
  const cityToPrint = nameToPrint ? (customerData?.city || '') : '';
  const bairroToPrint = nameToPrint ? (customerData?.bairro || '') : '';
  const streetToPrint = nameToPrint ? (customerData?.street || '') : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Cupom de Sorteio - ${couponNumber}</title>
      <style>
        @page { size: ${paperWidth} auto; margin: 0; }
        body {
          width: ${paperWidth === '58mm' ? '54mm' : '72mm'};
          margin: 0 auto;
          padding: 10px;
          font-family: 'Courier New', Courier, monospace;
          font-size: 11px;
          line-height: 1.2;
          color: #000;
          background: #fff;
        }
        .text-center { text-align: center; }
        .bold { font-weight: bold; }
        .box { border: 2px solid #000; padding: 10px; margin: 10px 0; border-radius: 4px; position: relative; }
        .invalid-watermark {
          border: 3px dashed #dc2626;
          color: #dc2626;
          font-weight: 900;
          font-size: 14px;
          text-align: center;
          padding: 8px;
          margin-bottom: 10px;
          text-transform: uppercase;
          background: #fef2f2;
        }
        .reprint-badge {
          background: #000;
          color: #fff;
          font-weight: bold;
          font-size: 10px;
          text-align: center;
          padding: 3px 6px;
          margin-bottom: 8px;
          border-radius: 2px;
        }
      </style>
    </head>
    <body>
      ${isInvalid ? `
        <div class="invalid-watermark">
          ❌ CUPOM CANCELADO / INVÁLIDO ❌<br/>
          <span style="font-size: 9px; font-weight: normal;">ESTE CUPOM NÃO POSSUI VALIDADE PARA O SORTEIO</span>
        </div>
      ` : ''}

      ${isReprint && !isInvalid ? `
        <div class="reprint-badge">
          [ 2ª VIA - REIMPRESSÃO ]
        </div>
      ` : ''}

      <div class="text-center">
        ${logoUrl ? `<img src="${logoUrl}" style="max-height: 45px; max-width: 140px; margin: 0 auto 6px auto; display: block; object-fit: contain;" />` : ''}
        <div class="bold" style="font-size: 13px; text-transform: uppercase;">${settings.name || 'Nossa Loja'}</div>
        ${settings.phone ? `<div style="font-size: 10px; margin-bottom: 4px;">Tel: ${settings.phone}</div>` : ''}
        <div class="bold" style="font-size: 14px; margin-top: 6px;">CUPOM DE SORTEIO</div>
        ${campaignTitle ? `<div class="bold" style="font-size: 12px; margin-top: 2px;">${campaignTitle}</div>` : ''}
        ${campaignPrize ? `<div style="font-size: 11px; margin-top: 2px;">Prêmio: ${campaignPrize}</div>` : ''}
        <div style="font-size: 9px; margin-top: 4px;">Preencha e deposite na urna!</div>
      </div>

      <div class="box">
        <div class="text-center bold" style="font-size: 16px; background: #f0f0f0; padding: 6px; margin-bottom: 10px; border-bottom: 1px solid #000;">
          CUPOM Nº: ${couponNumber}
        </div>
        <div style="margin-bottom: 8px;"><strong>Nome:</strong> ${nameToPrint ? `<span class="bold">${nameToPrint}</span>` : '___________________________________'}</div>
        <div style="margin-bottom: 8px;"><strong>Telefone:</strong> ${phoneToPrint ? `<span>${phoneToPrint}</span>` : '___________________________________'}</div>
        <div style="margin-bottom: 8px;"><strong>Cidade:</strong> ${cityToPrint ? `<span>${cityToPrint}</span>` : '___________________________________'}</div>
        <div style="margin-bottom: 8px;"><strong>Bairro:</strong> ${bairroToPrint ? `<span>${bairroToPrint}</span>` : '___________________________________'}</div>
        <div style="margin-bottom: 4px;"><strong>Rua:</strong> ${streetToPrint ? `<span>${streetToPrint}</span>` : '___________________________________'}</div>
      </div>
    </body>
    </html>
  `;
};

// Prints content using a New Window to force print dialog
export const printHtml = (htmlContent: string) => {
    // Center popup logic
    const width = 450;
    const height = 600;
    const left = (window.screen.width / 2) - (width / 2);
    const top = (window.screen.height / 2) - (height / 2);
    
    const printWindow = window.open('', '_blank', `width=${width},height=${height},top=${top},left=${left},toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes`);
    
    if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>Imprimir Cupom</title>
                    <style>
                        body { margin: 0; padding: 0; background-color: #fff; font-family: monospace; }
                        @media print {
                            @page { margin: 0; size: auto; }
                            body { margin: 0; -webkit-print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    ${htmlContent}
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.focus();
                                window.print();
                            }, 500);
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
    } else {
        // Fallback: Use iframe if popup is blocked
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.top = '-9999px';
        iframe.style.left = '-9999px';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        
        document.body.appendChild(iframe);
        
        const doc = iframe.contentWindow?.document;
        if (doc) {
            doc.open();
            doc.write(`<html><head><title>Print</title></head><body>${htmlContent}</body></html>`);
            doc.close();
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                setTimeout(() => document.body.removeChild(iframe), 2000);
            }, 500);
        } else {
            alert("Abertura de janela bloqueada. Permita pop-ups para imprimir.");
        }
    }
};

export const printReceipt = (sale: Sale, settings: CompanySettings, customer?: Customer, financialRecords?: FinancialRecord[], companies?: Company[], raffleCampaigns?: RaffleCampaign[]) => {
  const content = generateReceiptContent(sale, settings, customer, financialRecords, companies, raffleCampaigns);
  printHtml(content);
};

export const saveReceiptAsImage = async (sale: Sale, settings: CompanySettings, customer?: Customer, financialRecords?: FinancialRecord[], companies?: Company[], raffleCampaigns?: RaffleCampaign[]) => {
  // Create a hidden container to render the receipt
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.top = '-9999px';
  container.style.left = '-9999px';
  container.innerHTML = generateReceiptContent(sale, settings, customer, financialRecords, companies, raffleCampaigns);
  document.body.appendChild(container);

  const element = container.querySelector('#receipt-content') as HTMLElement;
  
  try {
    const canvas = await html2canvas(element, {
        scale: 2, // Better quality
        backgroundColor: '#ffffff'
    });
    
    const image = canvas.toDataURL("image/png");
    const link = document.createElement('a');
    link.href = image;
    link.download = `cupom_venda_${sale.id}.png`;
    link.click();
  } catch (error) {
    console.error("Erro ao gerar imagem do cupom", error);
    alert("Erro ao salvar imagem.");
  } finally {
    document.body.removeChild(container);
  }
};
