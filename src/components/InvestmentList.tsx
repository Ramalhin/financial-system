import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Investment, 
  InvestmentCalculator, 
  CDIService,
  formatCurrency, 
  formatPercent,
  generateId,
  InvestmentCalculation
} from '@/lib/financial-engine';
import { Plus, Wallet, Calendar, TrendingUp, Trash2 } from 'lucide-react';

interface InvestmentListProps {
  investments: Investment[];
  onAdd: (investment: Investment) => void;
  onRemove: (id: string) => void;
}

export function InvestmentList({ investments, onAdd, onRemove }: InvestmentListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cdiAnnual, setCdiAnnual] = useState(14.90); // Taxa anual em %
  const [formData, setFormData] = useState({
    name: '',
    type: 'CDB' as Investment['type'],
    principal: '',
    cdiPercentage: '100',
    depositDate: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    CDIService.fetchCurrentCDI().then(setCdiAnnual);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isExempt = formData.type === 'LCI' || formData.type === 'LCA';
    
    onAdd({
      id: generateId(),
      name: formData.name,
      type: formData.type,
      principal: parseFloat(formData.principal) || 0,
      cdiPercentage: parseFloat(formData.cdiPercentage) || 100,
      depositDate: new Date(formData.depositDate),
      isExemptFromIR: isExempt,
    });
    
    setIsOpen(false);
    setFormData({
      name: '',
      type: 'CDB',
      principal: '',
      cdiPercentage: '100',
      depositDate: new Date().toISOString().split('T')[0],
    });
  };

  const getTypeColor = (type: Investment['type']) => {
    const colors = {
      CDB: 'bg-primary/20 text-primary',
      LCI: 'bg-success/20 text-success',
      LCA: 'bg-success/20 text-success',
      Tesouro: 'bg-accent/20 text-accent',
      Caixinha: 'bg-purple-500/20 text-purple-400',
      Poupanca: 'bg-muted text-muted-foreground',
    };
    return colors[type] || colors.CDB;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-bold text-foreground flex items-center gap-2">
          <Wallet className="w-6 h-6 text-primary" />
          Meus Investimentos
        </h3>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button variant="gradient" size="sm">
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Novo Investimento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Nome do Investimento</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: CDB Nubank"
                  className="bg-input border-border"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select 
                    value={formData.type} 
                    onValueChange={(v) => setFormData({ ...formData, type: v as Investment['type'] })}
                  >
                    <SelectTrigger className="bg-input border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CDB">CDB</SelectItem>
                      <SelectItem value="LCI">LCI (Isento IR)</SelectItem>
                      <SelectItem value="LCA">LCA (Isento IR)</SelectItem>
                      <SelectItem value="Tesouro">Tesouro Direto</SelectItem>
                      <SelectItem value="Caixinha">Caixinha</SelectItem>
                      <SelectItem value="Poupanca">Poupança</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>% do CDI</Label>
                  <Input
                    type="number"
                    value={formData.cdiPercentage}
                    onChange={(e) => setFormData({ ...formData, cdiPercentage: e.target.value })}
                    className="bg-input border-border"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Valor Aplicado</Label>
                  <Input
                    type="number"
                    value={formData.principal}
                    onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                    placeholder="10000"
                    className="bg-input border-border"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Data do Aporte</Label>
                  <Input
                    type="date"
                    value={formData.depositDate}
                    onChange={(e) => setFormData({ ...formData, depositDate: e.target.value })}
                    className="bg-input border-border"
                    required
                  />
                </div>
              </div>
              
              <Button type="submit" variant="gradient" className="w-full">
                Adicionar Investimento
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {investments.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhum investimento cadastrado</p>
          <p className="text-sm text-muted-foreground/70">Adicione seu primeiro investimento para começar</p>
        </div>
      ) : (
        <div className="space-y-4">
          {investments.map((inv, index) => {
            const calc: InvestmentCalculation = InvestmentCalculator.calculate(inv, new Date(), cdiAnnual);
            
            return (
              <div 
                key={inv.id} 
                className="glass-card p-5 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${getTypeColor(inv.type)}`}>
                        {inv.type}
                      </span>
                      <h4 className="font-semibold text-foreground">{inv.name}</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Valor Aplicado</p>
                        <p className="font-medium text-foreground">{formatCurrency(inv.principal)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Valor Atual (Líq.)</p>
                        <p className="font-medium text-success">{formatCurrency(calc.netValue)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Rendimento</p>
                        <p className="font-medium text-success">+{formatCurrency(calc.netReturn)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Dias Investidos</p>
                        <p className="font-medium text-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {calc.daysInvested}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => onRemove(inv.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-muted-foreground">
                      <TrendingUp className="w-3 h-3 inline mr-1" />
                      {formatPercent(inv.cdiPercentage)} do CDI
                    </span>
                    {!inv.isExemptFromIR && (
                      <span className="text-muted-foreground">
                        IR: {formatPercent(calc.irRate)}
                      </span>
                    )}
                    {inv.isExemptFromIR && (
                      <span className="text-success">Isento de IR</span>
                    )}
                  </div>
                  <span className="text-muted-foreground">
                    Aporte: {new Date(inv.depositDate).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
