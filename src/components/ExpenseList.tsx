import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Expense, formatCurrency, generateId } from '@/lib/financial-engine';
import { Plus, CreditCard, Trash2, ShoppingBag, CheckCircle2, Clock } from 'lucide-react';

interface ExpenseListProps {
  expenses: Expense[];
  onAdd: (expense: Expense) => void;
  onRemove: (id: string) => void;
  onUpdate?: (expense: Expense) => void;
}

export function ExpenseList({ expenses, onAdd, onRemove, onUpdate }: ExpenseListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    totalAmount: '',
    installments: '1',
    category: 'Outros',
    startDate: new Date().toISOString().split('T')[0],
    isPaid: false,
    paymentDate: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = parseFloat(formData.totalAmount) || 0;
    const installments = parseInt(formData.installments) || 1;
    
    onAdd({
      id: generateId(),
      description: formData.description,
      totalAmount,
      installments,
      currentInstallment: 1,
      monthlyAmount: totalAmount / installments,
      startDate: new Date(formData.startDate),
      category: formData.category,
      isPaid: formData.isPaid,
      paymentDate: formData.paymentDate ? new Date(formData.paymentDate) : undefined,
    });
    
    setIsOpen(false);
    setFormData({
      description: '',
      totalAmount: '',
      installments: '1',
      category: 'Outros',
      startDate: new Date().toISOString().split('T')[0],
      isPaid: false,
      paymentDate: '',
    });
  };

  const handleTogglePaid = (expense: Expense) => {
    if (onUpdate) {
      onUpdate({
        ...expense,
        isPaid: !expense.isPaid,
      });
    }
  };

  const getCategoryIcon = (category: string) => {
    return <ShoppingBag className="w-4 h-4" />;
  };

  const totalPending = expenses.reduce((sum, exp) => {
    if (exp.isPaid) return sum;
    const remaining = exp.installments - exp.currentInstallment + 1;
    return sum + (exp.monthlyAmount * Math.max(0, remaining));
  }, 0);

  const totalMonthly = expenses.reduce((sum, exp) => {
    if (exp.isPaid) return sum;
    return sum + exp.monthlyAmount;
  }, 0);

  const paidCount = expenses.filter(e => e.isPaid).length;
  const pendingCount = expenses.filter(e => !e.isPaid).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-destructive" />
          Despesas
        </h3>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Nova Despesa</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: iPhone 15 Pro"
                  className="bg-input border-border"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Total</Label>
                  <Input
                    type="number"
                    value={formData.totalAmount}
                    onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                    placeholder="5000"
                    className="bg-input border-border"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Parcelas</Label>
                  <Input
                    type="number"
                    min="1"
                    max="48"
                    value={formData.installments}
                    onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                    className="bg-input border-border"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Data da Primeira Parcela</Label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="bg-input border-border"
                  required
                />
              </div>

              {/* Status de pagamento */}
              <div className="p-4 rounded-lg bg-secondary/30 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-success" />
                    <Label htmlFor="isPaid" className="cursor-pointer">Já foi paga?</Label>
                  </div>
                  <Switch
                    id="isPaid"
                    checked={formData.isPaid}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPaid: checked })}
                  />
                </div>

                {!formData.isPaid && (
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Data de pagamento prevista (opcional)
                    </Label>
                    <Input
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                      className="bg-input border-border"
                    />
                    <p className="text-xs text-muted-foreground">
                      Se informado, a despesa só entrará no cálculo a partir dessa data
                    </p>
                  </div>
                )}
              </div>
              
              {formData.totalAmount && formData.installments && (
                <div className="p-3 rounded-lg bg-secondary/50">
                  <p className="text-sm text-muted-foreground">Valor da Parcela</p>
                  <p className="font-display text-lg font-bold text-foreground">
                    {formatCurrency(parseFloat(formData.totalAmount) / parseInt(formData.installments))}
                  </p>
                </div>
              )}
              
              <Button type="submit" variant="gradient" className="w-full">
                Adicionar Despesa
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary */}
      {expenses.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Mensal</p>
            <p className="font-display text-xl font-bold text-destructive">
              {formatCurrency(totalMonthly)}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Pendente</p>
            <p className="font-display text-xl font-bold text-foreground">
              {formatCurrency(totalPending)}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground mb-1">Pendentes</p>
            <p className="font-display text-xl font-bold text-amber-500">
              {pendingCount}
            </p>
          </div>
          <div className="glass-card p-4">
            <p className="text-sm text-muted-foreground mb-1">Pagas</p>
            <p className="font-display text-xl font-bold text-success">
              {paidCount}
            </p>
          </div>
        </div>
      )}

      {expenses.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma despesa cadastrada</p>
          <p className="text-sm text-muted-foreground/70">Suas despesas aparecerão aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {expenses.map((exp, index) => {
            const remaining = exp.isPaid ? 0 : exp.installments - exp.currentInstallment + 1;
            const progress = exp.isPaid ? 100 : ((exp.currentInstallment - 1) / exp.installments) * 100;
            
            return (
              <div 
                key={exp.id} 
                className={`glass-card p-4 animate-slide-up ${exp.isPaid ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${exp.isPaid ? 'bg-success/20' : 'bg-secondary'}`}>
                      {exp.isPaid ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : (
                        getCategoryIcon(exp.category)
                      )}
                    </div>
                    <div>
                      <h4 className={`font-medium ${exp.isPaid ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {exp.description}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {exp.isPaid ? 'Paga' : `${exp.currentInstallment}/${exp.installments} parcelas`}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={`font-medium ${exp.isPaid ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {formatCurrency(exp.monthlyAmount)}/mês
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total: {formatCurrency(exp.totalAmount)}
                      </p>
                    </div>
                    
                    {onUpdate && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleTogglePaid(exp)}
                        className={exp.isPaid ? "text-success hover:text-success/80" : "text-muted-foreground hover:text-success"}
                        title={exp.isPaid ? "Marcar como pendente" : "Marcar como paga"}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => onRemove(exp.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                {/* Progress bar */}
                {!exp.isPaid && (
                  <>
                    <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Restam {remaining} parcelas • {formatCurrency(exp.monthlyAmount * remaining)} pendentes
                    </p>
                  </>
                )}

                {exp.paymentDate && !exp.isPaid && (
                  <p className="text-xs text-amber-500 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Pagamento previsto: {new Date(exp.paymentDate).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}