import { useState, useEffect } from 'react';
import { StatCard } from '@/components/StatCard';
import { InvestmentList } from '@/components/InvestmentList';
import { ExpenseList } from '@/components/ExpenseList';
import { WealthProjection } from '@/components/WealthProjection';
import { FinancialGoals } from '@/components/FinancialGoals';
import { ReportExport } from '@/components/ReportExport';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Toaster } from '@/components/ui/toaster';
import { 
  Investment, 
  Expense, 
  FinancialGoal,
  InvestmentCalculator,
  ExpenseManager,
  CDIService,
  formatCurrency,
  formatPercent
} from '@/lib/financial-engine';
import { 
  Wallet, 
  TrendingUp, 
  CreditCard, 
  PiggyBank,
  BarChart3,
  LineChart,
  Target
} from 'lucide-react';

const Index = () => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [cdiAnnual, setCdiAnnual] = useState(14.90);

  useEffect(() => {
    CDIService.fetchCurrentCDI().then((rate) => {
      setCdiAnnual(rate);
    });

    // Load from localStorage
    const savedInvestments = localStorage.getItem('investments');
    const savedExpenses = localStorage.getItem('expenses');
    const savedGoals = localStorage.getItem('goals');
    
    if (savedInvestments) {
      const parsed = JSON.parse(savedInvestments);
      setInvestments(parsed.map((inv: any) => ({
        ...inv,
        depositDate: new Date(inv.depositDate),
      })));
    }
    
    if (savedExpenses) {
      const parsed = JSON.parse(savedExpenses);
      setExpenses(parsed.map((exp: any) => ({
        ...exp,
        startDate: new Date(exp.startDate),
        paymentDate: exp.paymentDate ? new Date(exp.paymentDate) : undefined,
        isPaid: exp.isPaid ?? false,
      })));
    }

    if (savedGoals) {
      const parsed = JSON.parse(savedGoals);
      setGoals(parsed.map((goal: any) => ({
        ...goal,
        deadline: goal.deadline ? new Date(goal.deadline) : undefined,
        createdAt: new Date(goal.createdAt),
        completedAt: goal.completedAt ? new Date(goal.completedAt) : undefined,
      })));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('investments', JSON.stringify(investments));
  }, [investments]);

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('goals', JSON.stringify(goals));
  }, [goals]);

  const handleAddInvestment = (investment: Investment) => {
    setInvestments([...investments, investment]);
  };

  const handleRemoveInvestment = (id: string) => {
    setInvestments(investments.filter((inv) => inv.id !== id));
  };

  const handleAddExpense = (expense: Expense) => {
    setExpenses([...expenses, expense]);
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses(expenses.filter((exp) => exp.id !== id));
  };

  const handleUpdateExpense = (updatedExpense: Expense) => {
    setExpenses(expenses.map((exp) => 
      exp.id === updatedExpense.id ? updatedExpense : exp
    ));
  };

  const handleAddGoal = (goal: FinancialGoal) => {
    setGoals([...goals, goal]);
  };

  const handleRemoveGoal = (id: string) => {
    setGoals(goals.filter((g) => g.id !== id));
  };

  const handleUpdateGoal = (updatedGoal: FinancialGoal) => {
    setGoals(goals.map((g) => 
      g.id === updatedGoal.id ? updatedGoal : g
    ));
  };

  // Calculate totals
  const totalInvested = investments.reduce((sum, inv) => sum + inv.principal, 0);
  
  // Soma de todos os rendimentos líquidos individuais
  const totalReturn = investments.reduce((sum, inv) => {
    const calc = InvestmentCalculator.calculate(inv, new Date(), cdiAnnual);
    return sum + calc.netReturn;
  }, 0);
  
  const totalCurrentValue = totalInvested + totalReturn;
  
  const totalPendingExpenses = ExpenseManager.getTotalPendingExpenses(expenses);
  const monthlyExpenses = expenses.reduce((sum, exp) => {
    if (exp.isPaid) return sum;
    return sum + exp.monthlyAmount;
  }, 0);

  const activeGoals = goals.filter(g => !g.isCompleted).length;

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary to-[hsl(240,80%,65%)]">
                <PiggyBank className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">FinControl</h1>
                <p className="text-xs text-muted-foreground">Sistema de Controle Financeiro</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <ReportExport 
                investments={investments}
                expenses={expenses}
                goals={goals}
                cdiAnnual={cdiAnnual}
                totalWealth={totalCurrentValue}
                totalReturn={totalReturn}
              />
              <div className="text-right hidden sm:block">
                <p className="text-xs text-muted-foreground">Taxa CDI (BCB)</p>
                <p className="font-display font-bold text-primary">{formatPercent(cdiAnnual)} a.a.</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Patrimônio Total"
            value={formatCurrency(totalCurrentValue)}
            subtitle="Valor líquido atual"
            icon={<Wallet className="w-5 h-5 text-primary" />}
            variant="primary"
          />
          <StatCard
            title="Rendimento Total"
            value={formatCurrency(totalReturn)}
            trend={totalReturn >= 0 ? 'up' : 'down'}
            trendValue={totalInvested > 0 ? formatPercent((totalReturn / totalInvested) * 100) : '0%'}
            icon={<TrendingUp className="w-5 h-5 text-success" />}
            variant="success"
          />
          <StatCard
            title="Total Aplicado"
            value={formatCurrency(totalInvested)}
            subtitle={`${investments.length} investimentos`}
            icon={<BarChart3 className="w-5 h-5 text-accent" />}
            variant="gold"
          />
          <StatCard
            title="Despesas Pendentes"
            value={formatCurrency(totalPendingExpenses)}
            subtitle={`${formatCurrency(monthlyExpenses)}/mês`}
            icon={<CreditCard className="w-5 h-5 text-destructive" />}
          />
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="investments" className="space-y-6">
          <TabsList className="glass-card p-1 w-full md:w-auto">
            <TabsTrigger value="investments" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Wallet className="w-4 h-4" />
              <span className="hidden sm:inline">Investimentos</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Despesas</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Target className="w-4 h-4" />
              <span className="hidden sm:inline">Metas</span>
              {activeGoals > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary-foreground/20">
                  {activeGoals}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="projection" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <LineChart className="w-4 h-4" />
              <span className="hidden sm:inline">Projeção</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="investments" className="animate-fade-in">
            <InvestmentList 
              investments={investments}
              onAdd={handleAddInvestment}
              onRemove={handleRemoveInvestment}
            />
          </TabsContent>

          <TabsContent value="expenses" className="animate-fade-in">
            <ExpenseList
              expenses={expenses}
              onAdd={handleAddExpense}
              onRemove={handleRemoveExpense}
              onUpdate={handleUpdateExpense}
            />
          </TabsContent>

          <TabsContent value="goals" className="animate-fade-in">
            <FinancialGoals
              goals={goals}
              onAdd={handleAddGoal}
              onRemove={handleRemoveGoal}
              onUpdate={handleUpdateGoal}
              currentWealth={totalCurrentValue}
            />
          </TabsContent>

          <TabsContent value="projection" className="animate-fade-in">
            <WealthProjection 
              investments={investments}
              expenses={expenses}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-16 py-6">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            FinControl • Dados do CDI via API do Banco Central do Brasil
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;