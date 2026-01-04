import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { FinancialGoal, formatCurrency, generateId } from '@/lib/financial-engine';
import { 
  Plus, 
  Target, 
  Trash2, 
  Trophy, 
  Plane, 
  Home, 
  GraduationCap, 
  Car, 
  Umbrella,
  Sparkles,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface FinancialGoalsProps {
  goals: FinancialGoal[];
  onAdd: (goal: FinancialGoal) => void;
  onRemove: (id: string) => void;
  onUpdate: (goal: FinancialGoal) => void;
  currentWealth: number;
}

const GOAL_CATEGORIES = [
  { value: 'emergency', label: 'Reserva de Emergência', icon: Umbrella, color: 'text-blue-500' },
  { value: 'travel', label: 'Viagem', icon: Plane, color: 'text-cyan-500' },
  { value: 'property', label: 'Imóvel', icon: Home, color: 'text-amber-500' },
  { value: 'retirement', label: 'Aposentadoria', icon: Trophy, color: 'text-purple-500' },
  { value: 'education', label: 'Educação', icon: GraduationCap, color: 'text-green-500' },
  { value: 'car', label: 'Carro', icon: Car, color: 'text-red-500' },
  { value: 'other', label: 'Outro', icon: Target, color: 'text-gray-500' },
];

export function FinancialGoals({ goals, onAdd, onRemove, onUpdate, currentWealth }: FinancialGoalsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    deadline: '',
    category: 'other' as FinancialGoal['category'],
  });

  // Check for completed goals and show celebration
  useEffect(() => {
    goals.forEach((goal) => {
      if (!goal.isCompleted && goal.currentAmount >= goal.targetAmount) {
        onUpdate({
          ...goal,
          isCompleted: true,
          completedAt: new Date(),
        });
        
        toast({
          title: "🎉 Meta Alcançada!",
          description: `Parabéns! Você atingiu sua meta "${goal.name}"!`,
          duration: 5000,
        });
      }
    });
  }, [goals, onUpdate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onAdd({
      id: generateId(),
      name: formData.name,
      targetAmount: parseFloat(formData.targetAmount) || 0,
      currentAmount: parseFloat(formData.currentAmount) || 0,
      deadline: formData.deadline ? new Date(formData.deadline) : undefined,
      category: formData.category,
      createdAt: new Date(),
      isCompleted: false,
    });
    
    setIsOpen(false);
    setFormData({
      name: '',
      targetAmount: '',
      currentAmount: '',
      deadline: '',
      category: 'other',
    });

    toast({
      title: "Meta Criada!",
      description: "Sua nova meta financeira foi adicionada.",
    });
  };

  const handleUpdateAmount = (goal: FinancialGoal, newAmount: number) => {
    onUpdate({
      ...goal,
      currentAmount: newAmount,
    });
  };

  const getCategoryInfo = (category: FinancialGoal['category']) => {
    return GOAL_CATEGORIES.find(c => c.value === category) || GOAL_CATEGORIES[6];
  };

  const completedGoals = goals.filter(g => g.isCompleted);
  const activeGoals = goals.filter(g => !g.isCompleted);
  const totalTargetAmount = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const totalCurrentAmount = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const overallProgress = totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <Target className="w-6 h-6 text-primary" />
          Metas Financeiras
        </h3>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4" />
              Nova Meta
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Nova Meta Financeira</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome da Meta</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Viagem para Europa"
                  className="bg-input border-border"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData({ ...formData, category: v as FinancialGoal['category'] })}
                >
                  <SelectTrigger className="bg-input border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOAL_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <cat.icon className={`w-4 h-4 ${cat.color}`} />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Alvo (R$)</Label>
                  <Input
                    type="number"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                    placeholder="50000"
                    className="bg-input border-border"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Valor Atual (R$)</Label>
                  <Input
                    type="number"
                    value={formData.currentAmount}
                    onChange={(e) => setFormData({ ...formData, currentAmount: e.target.value })}
                    placeholder="0"
                    className="bg-input border-border"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Prazo (opcional)
                </Label>
                <Input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  className="bg-input border-border"
                />
              </div>
              
              <Button type="submit" variant="gradient" className="w-full">
                Criar Meta
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Resumo Geral */}
      {goals.length > 0 && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-muted-foreground">Progresso Geral</p>
              <p className="font-display text-2xl font-bold text-foreground">
                {formatCurrency(totalCurrentAmount)} <span className="text-muted-foreground text-lg">/ {formatCurrency(totalTargetAmount)}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="font-display text-3xl font-bold text-primary">{overallProgress.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">{completedGoals.length} metas concluídas</p>
            </div>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>
      )}

      {/* Sugestão de usar patrimônio */}
      {currentWealth > 0 && activeGoals.length > 0 && (
        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Dica</p>
              <p className="text-sm text-muted-foreground">
                Seu patrimônio atual de <strong className="text-success">{formatCurrency(currentWealth)}</strong> pode 
                ajudar a alcançar suas metas mais rapidamente!
              </p>
            </div>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma meta financeira</p>
          <p className="text-sm text-muted-foreground/70">Crie metas para acompanhar seu progresso</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Metas Ativas */}
          {activeGoals.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Metas Ativas</h4>
              {activeGoals.map((goal, index) => {
                const categoryInfo = getCategoryInfo(goal.category);
                const CategoryIcon = categoryInfo.icon;
                const progress = (goal.currentAmount / goal.targetAmount) * 100;
                const remaining = goal.targetAmount - goal.currentAmount;
                const daysUntilDeadline = goal.deadline 
                  ? Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                  : null;
                
                return (
                  <div 
                    key={goal.id} 
                    className="glass-card p-5 animate-slide-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl bg-secondary ${categoryInfo.color}`}>
                          <CategoryIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{goal.name}</h4>
                          <p className="text-sm text-muted-foreground">{categoryInfo.label}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => onRemove(goal.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progresso</span>
                        <span className="font-medium text-foreground">{progress.toFixed(1)}%</span>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-2.5" />
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-display text-lg font-bold text-foreground">
                            {formatCurrency(goal.currentAmount)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Faltam {formatCurrency(remaining)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg font-bold text-muted-foreground">
                            {formatCurrency(goal.targetAmount)}
                          </p>
                          {daysUntilDeadline !== null && (
                            <p className={`text-xs ${daysUntilDeadline < 30 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                              {daysUntilDeadline > 0 ? `${daysUntilDeadline} dias restantes` : 'Prazo expirado'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Quick update */}
                      <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
                        <Input
                          type="number"
                          placeholder="Novo valor atual"
                          className="bg-input border-border text-sm h-9"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const value = parseFloat((e.target as HTMLInputElement).value);
                              if (!isNaN(value)) {
                                handleUpdateAmount(goal, value);
                                (e.target as HTMLInputElement).value = '';
                              }
                            }
                          }}
                        />
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={(e) => {
                            const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
                            const value = parseFloat(input.value);
                            if (!isNaN(value)) {
                              handleUpdateAmount(goal, value);
                              input.value = '';
                            }
                          }}
                        >
                          Atualizar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Metas Concluídas */}
          {completedGoals.length > 0 && (
            <div className="space-y-3 mt-6">
              <h4 className="text-sm font-medium text-success uppercase tracking-wide flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Metas Concluídas ({completedGoals.length})
              </h4>
              {completedGoals.map((goal) => {
                const categoryInfo = getCategoryInfo(goal.category);
                const CategoryIcon = categoryInfo.icon;
                
                return (
                  <div 
                    key={goal.id} 
                    className="glass-card p-4 opacity-75 border-success/30"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-success/20">
                          <CheckCircle2 className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground line-through">{goal.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(goal.targetAmount)} • Concluída em {goal.completedAt?.toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => onRemove(goal.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}