import { useState, useEffect, useMemo } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Investment, 
  Expense, 
  FinancialEngine, 
  CDIService,
  formatCurrency,
  ProjectionResult 
} from '@/lib/financial-engine';
import { TrendingUp, Calendar, Target } from 'lucide-react';

interface WealthProjectionProps {
  investments: Investment[];
  expenses: Expense[];
}

export function WealthProjection({ investments, expenses }: WealthProjectionProps) {
  const [periodType, setPeriodType] = useState<'months' | 'years'>('months');
  const [periodValue, setPeriodValue] = useState(12);
  const [monthlySavings, setMonthlySavings] = useState(0);
  const [cdiAnnual, setCdiAnnual] = useState(14.90);
  const [projection, setProjection] = useState<ProjectionResult[]>([]);

  useEffect(() => {
    CDIService.fetchCurrentCDI().then(setCdiAnnual);
  }, []);

  // Converte para meses
  const totalMonths = periodType === 'years' ? periodValue * 12 : periodValue;

  useEffect(() => {
    const results = FinancialEngine.projectWealth(
      investments,
      expenses,
      totalMonths,
      cdiAnnual,
      monthlySavings
    );
    setProjection(results);
  }, [investments, expenses, totalMonths, cdiAnnual, monthlySavings]);

  const chartData = useMemo(() => {
    return projection.map((p) => ({
      ...p,
      month: p.month,
      patrimonio: p.totalInvestments,
      despesas: p.totalExpenses,
    }));
  }, [projection]);

  const finalValue = projection[projection.length - 1]?.totalInvestments || 0;
  const initialValue = projection[0]?.totalInvestments || 0;
  const totalGrowth = finalValue - initialValue;
  const growthPercent = initialValue > 0 ? ((finalValue / initialValue) - 1) * 100 : 0;
  
  // Soma total de rendimentos
  const totalReturns = projection.reduce((sum, p) => sum + p.monthlyReturn, 0);
  
  // Soma total de despesas no período
  const totalExpensesInPeriod = projection.reduce((sum, p) => sum + p.totalExpenses, 0);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card p-4 border border-border">
          <p className="font-medium text-foreground mb-2">{label}</p>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-muted-foreground">Patrimônio: </span>
              <span className="text-success font-medium">{formatCurrency(payload[0]?.value || 0)}</span>
            </p>
            {payload[1]?.value > 0 && (
              <p className="text-sm">
                <span className="text-muted-foreground">Despesas/mês: </span>
                <span className="text-destructive font-medium">{formatCurrency(payload[1]?.value || 0)}</span>
              </p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" />
          Projeção de Patrimônio
        </h3>
      </div>

      {/* Controls */}
      <div className="glass-card p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Tipo de período */}
          <div className="space-y-2">
            <Label className="text-muted-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Tipo de Período
            </Label>
            <Select value={periodType} onValueChange={(v) => setPeriodType(v as 'months' | 'years')}>
              <SelectTrigger className="bg-input border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="months">Meses</SelectItem>
                <SelectItem value="years">Anos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quantidade */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">
              Quantidade de {periodType === 'months' ? 'Meses' : 'Anos'}
            </Label>
            <Input
              type="number"
              min="1"
              max={periodType === 'months' ? 120 : 30}
              value={periodValue}
              onChange={(e) => setPeriodValue(parseInt(e.target.value) || 1)}
              className="bg-input border-border"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-muted-foreground flex items-center gap-2">
              <Target className="w-4 h-4" />
              Aporte Mensal
            </Label>
            <Input
              type="number"
              value={monthlySavings}
              onChange={(e) => setMonthlySavings(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="bg-input border-border"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-muted-foreground">Projeção Final</Label>
            <div className="p-3 rounded-lg bg-success/10 border border-success/20">
              <p className="font-display text-2xl font-bold text-success">
                {formatCurrency(finalValue)}
              </p>
              <p className="text-sm text-success/80">
                +{formatCurrency(totalGrowth)} ({growthPercent.toFixed(1)}%)
              </p>
            </div>
          </div>
        </div>

        {/* Resumo adicional */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-4 border-t border-border/50">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Período</p>
            <p className="font-display font-bold text-foreground">
              {totalMonths} meses
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Rendimentos Totais</p>
            <p className="font-display font-bold text-success">
              {formatCurrency(totalReturns)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Despesas no Período</p>
            <p className="font-display font-bold text-destructive">
              {formatCurrency(totalExpensesInPeriod)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Aportes Totais</p>
            <p className="font-display font-bold text-primary">
              {formatCurrency(monthlySavings * totalMonths)}
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-6">
        {investments.length === 0 && monthlySavings === 0 ? (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Adicione investimentos ou aportes mensais para ver a projeção</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPatrimonio" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(222, 30%, 18%)' }}
                tickLine={{ stroke: 'hsl(222, 30%, 18%)' }}
              />
              <YAxis 
                tick={{ fill: 'hsl(215, 20%, 55%)', fontSize: 12 }}
                axisLine={{ stroke: 'hsl(222, 30%, 18%)' }}
                tickLine={{ stroke: 'hsl(222, 30%, 18%)' }}
                tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="patrimonio"
                stroke="hsl(142, 71%, 45%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPatrimonio)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Table */}
      {projection.length > 0 && (investments.length > 0 || monthlySavings > 0) && (
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-border">
            <h4 className="font-display font-semibold text-foreground">Projeção Detalhada</h4>
          </div>
          <div className="max-h-[300px] overflow-auto">
            <table className="w-full">
              <thead className="bg-secondary/50 sticky top-0">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Mês</th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Patrimônio</th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Rendimento</th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Despesas</th>
                </tr>
              </thead>
              <tbody>
                {projection.filter((_, i) => i % 3 === 0 || i === projection.length - 1).map((p, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                    <td className="p-3 text-sm text-foreground">{p.month}</td>
                    <td className="p-3 text-sm text-right font-medium text-foreground">
                      {formatCurrency(p.totalInvestments)}
                    </td>
                    <td className="p-3 text-sm text-right text-success">
                      +{formatCurrency(p.monthlyReturn)}
                    </td>
                    <td className="p-3 text-sm text-right text-destructive">
                      {p.totalExpenses > 0 ? `-${formatCurrency(p.totalExpenses)}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}