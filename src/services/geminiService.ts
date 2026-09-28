// @ts-nocheck
import { Sale, Product, FinancialRecord } from "../types";

const callAiApi = async (prompt: string, model: string = "gemini-1.5-flash") => {
  try {
    const response = await fetch("/api/ai/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, model }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Server error");
    }
    
    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error("AI Proxy Error:", error);
    throw error;
  }
};

export const analyzeSalesData = async (sales: Sale[], products: Product[]) => {
  const salesSummary = sales.map(s => ({
    date: s.date,
    total: s.total,
    method: s.paymentMethod,
    itemCount: s.items.length
  }));

  const prompt = `
    Analyze the following sales data and provide a strategic summary in Portuguese (pt-BR).
    Identify trends, best-selling periods, and suggestions for increasing revenue.
    
    Data: ${JSON.stringify(salesSummary.slice(0, 50))}
  `;

  try {
    return await callAiApi(prompt, "gemini-1.5-pro");
  } catch (error) {
    return "Não foi possível analisar os dados no momento.";
  }
};

export const generateProductDescription = async (productName: string) => {
  try {
    return await callAiApi(`Write a short, appealing marketing description (max 30 words) for a product named "${productName}" in Portuguese.`);
  } catch (error) {
    return "Descrição automática indisponível.";
  }
};

export const analyzeFinancialHealth = async (records: FinancialRecord[]) => {
  const summary = records.map(r => ({
    type: r.type,
    amount: r.amount,
    status: r.status,
    due: r.dueDate
  }));

  try {
    return await callAiApi(`Analyze these financial records. Give me 3 bullet points in Portuguese on cash flow health and alerts for overdue accounts. Data: ${JSON.stringify(summary)}`);
  } catch (error) {
    return "Análise financeira indisponível.";
  }
};
