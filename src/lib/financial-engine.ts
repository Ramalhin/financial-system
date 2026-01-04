// Motor Financeiro - Lógica do Sistema de Controle Financeiro
// Baseado nas regras do mercado financeiro brasileiro
// Usando 252 dias úteis para capitalização e dias corridos para tributação

// ============================================================
// TIPOS E INTERFACES
// ============================================================

export interface Investment {
  id: string;
  name: string;
  type: 'CDB' | 'LCI' | 'LCA' | 'Tesouro' | 'Caixinha' | 'Poupanca';
  principal: number;
  cdiPercentage: number; // Ex: 100 para 100% do CDI, 110 para 110% do CDI
  depositDate: Date;
  maturityDate?: Date;
  isExemptFromIR: boolean; // LCI/LCA são isentos
}

export interface Expense {
  id: string;
  description: string;
  totalAmount: number;
  installments: number;
  currentInstallment: number;
  monthlyAmount: number;
  startDate: Date;
  category: string;
  isPaid: boolean;
  paymentDate?: Date; // Data em que será paga (se não for paga ainda)
}

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: Date;
  category: 'emergency' | 'travel' | 'property' | 'retirement' | 'education' | 'car' | 'other';
  createdAt: Date;
  isCompleted: boolean;
  completedAt?: Date;
}

export interface ProjectionResult {
  month: string;
  date: Date;
  totalInvestments: number;
  totalExpenses: number;
  netWorth: number;
  monthlyReturn: number;
}

export interface InvestmentCalculation {
  grossValue: number;
  grossReturn: number;
  iofAmount: number;
  irAmount: number;
  netValue: number;
  netReturn: number;
  effectiveRate: number;
  daysInvested: number; // Dias corridos
  businessDays: number; // Dias úteis
  irRate: number;
  iofRate: number;
}

// ============================================================
// CONSTANTES DO MERCADO BRASILEIRO
// ============================================================

const BUSINESS_DAYS_PER_YEAR = 252;
const CALENDAR_DAYS_PER_YEAR = 365;

// ============================================================
// CLASSE: CDI SERVICE (API do Banco Central)
// ============================================================

export class CDIService {
  // Série 4389 = Taxa Selic (meta) - retorna taxa ANUAL em %
  private static readonly BCB_API_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json';
  private static cachedCDI: number | null = null;
  private static lastFetch: Date | null = null;
  private static readonly CACHE_DURATION_MS = 3600000; // 1 hora

  /**
   * Busca a taxa CDI/Selic ANUAL na API do Banco Central do Brasil
   * A API retorna a taxa em percentual (ex: 14.90 para 14.90% a.a.)
   */
  static async fetchCurrentCDI(): Promise<number> {
    // Verifica cache
    if (this.cachedCDI !== null && this.lastFetch) {
      const now = new Date();
      if (now.getTime() - this.lastFetch.getTime() < this.CACHE_DURATION_MS) {
        return this.cachedCDI;
      }
    }

    try {
      const response = await fetch(this.BCB_API_URL);
      if (!response.ok) {
        throw new Error('Falha ao buscar CDI do Banco Central');
      }
      
      const data = await response.json();
      if (data && data.length > 0) {
        // A API retorna a taxa ANUAL em percentual (ex: "14.90")
        const annualRate = parseFloat(data[0].valor);
        this.cachedCDI = annualRate;
        this.lastFetch = new Date();
        console.log(`CDI/Selic obtido do BCB: ${annualRate}% a.a.`);
        return annualRate;
      }
      
      throw new Error('Dados do CDI não encontrados');
    } catch (error) {
      console.error('Erro ao buscar CDI:', error);
      // Retorna taxa aproximada como fallback (CDI ~14.90% a.a.)
      return 14.90;
    }
  }

  /**
   * Converte taxa ANUAL para taxa DIÁRIA (base 252 dias úteis)
   * Fórmula: i_dia = (1 + taxa_anual)^(1/252) - 1
   */
  static annualToDaily(annualRatePercent: number): number {
    const annualRate = annualRatePercent / 100;
    const dailyRate = Math.pow(1 + annualRate, 1 / BUSINESS_DAYS_PER_YEAR) - 1;
    return dailyRate * 100; // Retorna em percentual
  }

  /**
   * Converte taxa diária para anual (base 252 dias úteis)
   */
  static dailyToAnnual(dailyRatePercent: number): number {
    const dailyRate = dailyRatePercent / 100;
    const annualRate = Math.pow(1 + dailyRate, BUSINESS_DAYS_PER_YEAR) - 1;
    return annualRate * 100;
  }

  /**
   * Converte taxa anual para mensal (base 12 meses)
   */
  static annualToMonthly(annualRatePercent: number): number {
    const annualRate = annualRatePercent / 100;
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    return monthlyRate * 100;
  }
}

// ============================================================
// CLASSE: BUSINESS DAYS CALCULATOR
// ============================================================

export class BusinessDaysCalculator {
  /**
   * Lista de feriados nacionais fixos (sem considerar móveis para simplificação)
   * Em produção, usar uma biblioteca como 'date-holidays' ou API de feriados
   */
  private static readonly FIXED_HOLIDAYS = [
    { month: 0, day: 1 },   // Ano Novo
    { month: 3, day: 21 },  // Tiradentes
    { month: 4, day: 1 },   // Dia do Trabalho
    { month: 8, day: 7 },   // Independência
    { month: 9, day: 12 },  // N. Sra. Aparecida
    { month: 10, day: 2 },  // Finados
    { month: 10, day: 15 }, // Proclamação da República
    { month: 11, day: 25 }, // Natal
  ];

  /**
   * Verifica se uma data é dia útil (não é fim de semana nem feriado fixo)
   */
  static isBusinessDay(date: Date): boolean {
    const dayOfWeek = date.getDay();
    
    // Fim de semana
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return false;
    }
    
    // Feriado fixo
    const month = date.getMonth();
    const day = date.getDate();
    const isHoliday = this.FIXED_HOLIDAYS.some(
      h => h.month === month && h.day === day
    );
    
    return !isHoliday;
  }

  /**
   * Calcula o número de dias úteis entre duas datas
   */
  static getBusinessDays(startDate: Date, endDate: Date): number {
    let count = 0;
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    
    while (current < end) {
      current.setDate(current.getDate() + 1);
      if (this.isBusinessDay(current)) {
        count++;
      }
    }
    
    return count;
  }

  /**
   * Calcula dias corridos entre duas datas
   */
  static getCalendarDays(startDate: Date, endDate: Date): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  }

  /**
   * Estimativa rápida de dias úteis (252/365 ratio)
   * Usar quando performance é crítica
   */
  static estimateBusinessDays(calendarDays: number): number {
    return Math.round(calendarDays * (BUSINESS_DAYS_PER_YEAR / CALENDAR_DAYS_PER_YEAR));
  }
}

// ============================================================
// CLASSE: TAX CALCULATOR (IR e IOF)
// ============================================================

export class TaxCalculator {
  /**
   * Tabela Regressiva do Imposto de Renda para Renda Fixa
   * Baseada em DIAS CORRIDOS
   */
  static readonly IR_TABLE = [
    { maxDays: 180, rate: 22.5 },
    { maxDays: 360, rate: 20.0 },
    { maxDays: 720, rate: 17.5 },
    { maxDays: Infinity, rate: 15.0 },
  ];

  /**
   * Tabela Regressiva do IOF (30 dias)
   * Índice = dia - 1 (dia 1 = índice 0)
   * Valores em percentual do rendimento
   */
  static readonly IOF_TABLE: number[] = [
    96, 93, 90, 86, 83, 80, 76, 73, 70, 66,  // Dias 1-10
    63, 60, 56, 53, 50, 46, 43, 40, 36, 33,  // Dias 11-20
    30, 26, 23, 20, 16, 13, 10, 6, 3, 0      // Dias 21-30
  ];

  /**
   * Calcula a alíquota de IR com base no prazo (DIAS CORRIDOS)
   */
  static getIRRate(calendarDays: number): number {
    for (const bracket of this.IR_TABLE) {
      if (calendarDays <= bracket.maxDays) {
        return bracket.rate;
      }
    }
    return 15.0;
  }

  /**
   * Calcula a alíquota de IOF com base no prazo (DIAS CORRIDOS)
   * IOF é zerado após 30 dias
   */
  static getIOFRate(calendarDays: number): number {
    if (calendarDays <= 0) return 96;
    if (calendarDays > 30) return 0;
    return this.IOF_TABLE[calendarDays - 1];
  }

  /**
   * Calcula IOF sobre o rendimento bruto
   * @param grossReturn Rendimento bruto (lucro antes de impostos)
   * @param calendarDays Dias corridos desde o aporte
   */
  static calculateIOF(grossReturn: number, calendarDays: number): number {
    if (grossReturn <= 0) return 0;
    const rate = this.getIOFRate(calendarDays);
    return grossReturn * (rate / 100);
  }

  /**
   * Calcula IR sobre o rendimento (após dedução do IOF)
   * @param grossReturn Rendimento bruto
   * @param iofAmount Valor do IOF já calculado
   * @param calendarDays Dias corridos
   */
  static calculateIR(grossReturn: number, iofAmount: number, calendarDays: number): number {
    // Base de cálculo do IR = Rendimento bruto - IOF
    const baseIR = grossReturn - iofAmount;
    if (baseIR <= 0) return 0;
    
    const rate = this.getIRRate(calendarDays);
    return baseIR * (rate / 100);
  }
}

// ============================================================
// CLASSE: INVESTMENT CALCULATOR
// ============================================================

export class InvestmentCalculator {
  /**
   * Calcula o valor de um investimento em renda fixa
   * Usa DIAS ÚTEIS para capitalização e DIAS CORRIDOS para tributação
   */
  static calculate(
    investment: Investment,
    currentDate: Date,
    cdiAnnualRate: number // Taxa CDI ANUAL em percentual (ex: 14.90)
  ): InvestmentCalculation {
    const depositDate = new Date(investment.depositDate);
    
    // Dias corridos (para tributação)
    const calendarDays = BusinessDaysCalculator.getCalendarDays(depositDate, currentDate);
    
    // Dias úteis (para capitalização)
    // Usar estimativa para melhor performance, ou cálculo exato se precisar
    const businessDays = BusinessDaysCalculator.estimateBusinessDays(calendarDays);
    
    // Calcula taxa diária efetiva do investimento
    // Fórmula: taxa_dia = (1 + taxa_anual)^(1/252) - 1
    const cdiDailyRate = CDIService.annualToDaily(cdiAnnualRate) / 100; // Em decimal
    const effectiveDailyRate = cdiDailyRate * (investment.cdiPercentage / 100);
    
    // Calcula montante bruto (capitalização por dias úteis)
    // Fórmula: M_bruto = Principal × (1 + taxa_dia)^dias_uteis
    const grossMultiplier = Math.pow(1 + effectiveDailyRate, businessDays);
    const grossValue = investment.principal * grossMultiplier;
    const grossReturn = grossValue - investment.principal;

    // Calcula impostos (usa dias corridos)
    let iofAmount = 0;
    let irAmount = 0;
    let irRate = 0;
    let iofRate = 0;

    if (!investment.isExemptFromIR) {
      // 1. Primeiro calcula IOF sobre rendimento bruto
      iofRate = TaxCalculator.getIOFRate(calendarDays);
      iofAmount = TaxCalculator.calculateIOF(grossReturn, calendarDays);
      
      // 2. Depois calcula IR sobre (rendimento bruto - IOF)
      irRate = TaxCalculator.getIRRate(calendarDays);
      irAmount = TaxCalculator.calculateIR(grossReturn, iofAmount, calendarDays);
    }

    // Valor líquido final
    const netValue = grossValue - iofAmount - irAmount;
    const netReturn = netValue - investment.principal;

    // Taxa efetiva anualizada (rentabilidade líquida)
    const effectiveRate = calendarDays > 0 
      ? (Math.pow(netValue / investment.principal, CALENDAR_DAYS_PER_YEAR / calendarDays) - 1) * 100
      : 0;

    return {
      grossValue,
      grossReturn,
      iofAmount,
      irAmount,
      netValue,
      netReturn,
      effectiveRate,
      daysInvested: calendarDays,
      businessDays,
      irRate,
      iofRate,
    };
  }

  /**
   * Projeta o valor futuro de um investimento
   */
  static projectFutureValue(
    investment: Investment,
    targetDate: Date,
    cdiAnnualRate: number
  ): InvestmentCalculation {
    return this.calculate(investment, targetDate, cdiAnnualRate);
  }
}

// ============================================================
// CLASSE: EXPENSE MANAGER
// ============================================================

export class ExpenseManager {
  /**
   * Calcula o total de despesas pendentes para um mês específico
   * Considera se a despesa já foi paga ou se a parcela já terminou
   */
  static getMonthlyExpenses(expenses: Expense[], targetDate: Date): number {
    return expenses.reduce((total, expense) => {
      // Se já está paga, não conta
      if (expense.isPaid) {
        return total;
      }

      // Se tem data de pagamento futura e ainda não chegou
      if (expense.paymentDate) {
        const paymentDate = new Date(expense.paymentDate);
        if (targetDate < paymentDate) {
          return total;
        }
      }

      const startDate = new Date(expense.startDate);
      const monthsDiff = this.getMonthsDifference(startDate, targetDate);
      
      // Verifica se a parcela ainda está ativa (não passou do número de parcelas)
      if (monthsDiff >= 0 && monthsDiff < expense.installments) {
        return total + expense.monthlyAmount;
      }
      return total;
    }, 0);
  }

  /**
   * Calcula o total restante de todas as despesas (não pagas)
   */
  static getTotalPendingExpenses(expenses: Expense[]): number {
    return expenses.reduce((total, expense) => {
      // Se já está paga, não conta
      if (expense.isPaid) {
        return total;
      }
      
      const remainingInstallments = expense.installments - expense.currentInstallment + 1;
      return total + (expense.monthlyAmount * Math.max(0, remainingInstallments));
    }, 0);
  }

  /**
   * Calcula quantas parcelas ainda restam para um mês específico
   */
  static getRemainingInstallments(expense: Expense, targetDate: Date): number {
    if (expense.isPaid) return 0;
    
    const startDate = new Date(expense.startDate);
    const monthsDiff = this.getMonthsDifference(startDate, targetDate);
    
    if (monthsDiff < 0) return expense.installments;
    if (monthsDiff >= expense.installments) return 0;
    
    return expense.installments - monthsDiff;
  }

  private static getMonthsDifference(startDate: Date, endDate: Date): number {
    return (
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth())
    );
  }
}

// ============================================================
// CLASSE: FINANCIAL ENGINE (Motor de Projeção)
// ============================================================

export class FinancialEngine {
  /**
   * Projeta o patrimônio mês a mês
   * Considera:
   * - Patrimônio atual e seus rendimentos
   * - Aportes mensais com rendimentos
   * - Despesas parceladas (terminam quando acabam as parcelas)
   * - Despesas pagas/não pagas
   */
  static projectWealth(
    investments: Investment[],
    expenses: Expense[],
    months: number,
    cdiAnnualRate: number,
    monthlySavings: number = 0
  ): ProjectionResult[] {
    const results: ProjectionResult[] = [];
    const startDate = new Date();

    // Taxa mensal equivalente
    const monthlyRate = CDIService.annualToMonthly(cdiAnnualRate) / 100;

    // Patrimônio acumulado (inclui descontos de despesas)
    let accumulatedWealth = 0;
    let totalAccumulatedExpenses = 0;

    for (let i = 0; i <= months; i++) {
      const targetDate = new Date(startDate);
      targetDate.setMonth(targetDate.getMonth() + i);

      // Calcula valor total dos investimentos existentes nessa data
      const totalInvestments = investments.reduce((sum, inv) => {
        const calc = InvestmentCalculator.calculate(inv, targetDate, cdiAnnualRate);
        return sum + calc.netValue;
      }, 0);

      // Calcula aportes mensais com rendimento composto
      let accumulatedSavings = 0;
      for (let j = 1; j <= i; j++) {
        const monthsOfReturn = i - j;
        accumulatedSavings += monthlySavings * Math.pow(1 + monthlyRate, monthsOfReturn);
      }

      // Calcula despesas do mês (só conta se ainda tiver parcelas)
      const monthlyExpenses = ExpenseManager.getMonthlyExpenses(expenses, targetDate);
      totalAccumulatedExpenses += monthlyExpenses;

      // Total bruto (investimentos + aportes acumulados)
      const totalBruto = totalInvestments + accumulatedSavings;
      
      // Patrimônio líquido = total bruto - despesas acumuladas
      accumulatedWealth = totalBruto - totalAccumulatedExpenses;

      // Calcula rendimento do mês
      const previousMonth = i > 0 ? results[i - 1] : null;
      const previousTotal = previousMonth?.totalInvestments ?? 
        investments.reduce((sum, inv) => sum + inv.principal, 0);
      
      const monthlyReturn = i > 0 ? totalInvestments - previousTotal + (monthlySavings * monthlyRate) : 0;

      results.push({
        month: targetDate.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        date: targetDate,
        totalInvestments: accumulatedWealth,
        totalExpenses: monthlyExpenses,
        netWorth: accumulatedWealth,
        monthlyReturn: Math.max(0, monthlyReturn),
      });
    }

    return results;
  }

  /**
   * Simula um investimento específico com cálculos detalhados
   */
  static async simulateInvestment(
    principal: number,
    cdiPercentage: number,
    years: number,
    isExemptFromIR: boolean = false
  ): Promise<{ year1: InvestmentCalculation; year2: InvestmentCalculation; cdiAnnual: number }> {
    const cdiAnnual = await CDIService.fetchCurrentCDI();
    
    const investment: Investment = {
      id: 'simulation',
      name: 'Simulação',
      type: isExemptFromIR ? 'LCI' : 'CDB',
      principal,
      cdiPercentage,
      depositDate: new Date(),
      isExemptFromIR,
    };

    const year1Date = new Date();
    year1Date.setFullYear(year1Date.getFullYear() + 1);

    const year2Date = new Date();
    year2Date.setFullYear(year2Date.getFullYear() + 2);

    return {
      year1: InvestmentCalculator.calculate(investment, year1Date, cdiAnnual),
      year2: InvestmentCalculator.calculate(investment, year2Date, cdiAnnual),
      cdiAnnual,
    };
  }
}

// ============================================================
// UTILITÁRIOS
// ============================================================

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const formatPercent = (value: number, decimals: number = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 15);
};
