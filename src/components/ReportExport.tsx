import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Investment, 
  Expense, 
  FinancialGoal,
  InvestmentCalculator,
  formatCurrency,
  formatPercent
} from '@/lib/financial-engine';
import { FileDown, FileText, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportExportProps {
  investments: Investment[];
  expenses: Expense[];
  goals: FinancialGoal[];
  cdiAnnual: number;
  totalWealth: number;
  totalReturn: number;
}

export function ReportExport({ 
  investments, 
  expenses, 
  goals, 
  cdiAnnual,
  totalWealth,
  totalReturn 
}: ReportExportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [options, setOptions] = useState({
    includeInvestments: true,
    includeExpenses: true,
    includeGoals: true,
    includeSummary: true,
  });

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let yPosition = 20;

      // Header
      doc.setFontSize(24);
      doc.setTextColor(99, 102, 241); // Primary color
      doc.text('FinControl', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 10;
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      doc.text('Relatório Financeiro', pageWidth / 2, yPosition, { align: 'center' });
      
      yPosition += 8;
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 15;

      // Summary Section
      if (options.includeSummary) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Resumo do Patrimônio', 14, yPosition);
        yPosition += 8;

        const totalInvested = investments.reduce((sum, inv) => sum + inv.principal, 0);
        const pendingExpenses = expenses.filter(e => !e.isPaid).reduce((sum, exp) => {
          const remaining = exp.installments - exp.currentInstallment + 1;
          return sum + (exp.monthlyAmount * Math.max(0, remaining));
        }, 0);

        autoTable(doc, {
          startY: yPosition,
          head: [['Indicador', 'Valor']],
          body: [
            ['Patrimônio Total', formatCurrency(totalWealth)],
            ['Total Aplicado', formatCurrency(totalInvested)],
            ['Rendimento Total', formatCurrency(totalReturn)],
            ['Rentabilidade', formatPercent(totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0)],
            ['Taxa CDI (a.a.)', formatPercent(cdiAnnual)],
            ['Despesas Pendentes', formatCurrency(pendingExpenses)],
          ],
          theme: 'striped',
          headStyles: { fillColor: [99, 102, 241] },
          margin: { left: 14, right: 14 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Investments Section
      if (options.includeInvestments && investments.length > 0) {
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Investimentos', 14, yPosition);
        yPosition += 8;

        const investmentData = investments.map((inv) => {
          const calc = InvestmentCalculator.calculate(inv, new Date(), cdiAnnual);
          return [
            inv.name,
            inv.type,
            formatCurrency(inv.principal),
            `${inv.cdiPercentage}%`,
            formatCurrency(calc.netValue),
            formatCurrency(calc.netReturn),
            new Date(inv.depositDate).toLocaleDateString('pt-BR'),
          ];
        });

        autoTable(doc, {
          startY: yPosition,
          head: [['Nome', 'Tipo', 'Aplicado', '% CDI', 'Valor Atual', 'Rendimento', 'Data']],
          body: investmentData,
          theme: 'striped',
          headStyles: { fillColor: [34, 197, 94] },
          margin: { left: 14, right: 14 },
          styles: { fontSize: 8 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Expenses Section
      if (options.includeExpenses && expenses.length > 0) {
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Despesas', 14, yPosition);
        yPosition += 8;

        const expenseData = expenses.map((exp) => {
          const remaining = exp.isPaid ? 0 : exp.installments - exp.currentInstallment + 1;
          return [
            exp.description,
            exp.isPaid ? 'Paga' : 'Pendente',
            formatCurrency(exp.totalAmount),
            `${exp.currentInstallment}/${exp.installments}`,
            formatCurrency(exp.monthlyAmount),
            formatCurrency(exp.monthlyAmount * remaining),
            new Date(exp.startDate).toLocaleDateString('pt-BR'),
          ];
        });

        autoTable(doc, {
          startY: yPosition,
          head: [['Descrição', 'Status', 'Total', 'Parcelas', 'Mensal', 'Pendente', 'Início']],
          body: expenseData,
          theme: 'striped',
          headStyles: { fillColor: [239, 68, 68] },
          margin: { left: 14, right: 14 },
          styles: { fontSize: 8 },
        });

        yPosition = (doc as any).lastAutoTable.finalY + 15;
      }

      // Goals Section
      if (options.includeGoals && goals.length > 0) {
        if (yPosition > 240) {
          doc.addPage();
          yPosition = 20;
        }

        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('Metas Financeiras', 14, yPosition);
        yPosition += 8;

        const goalsData = goals.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          return [
            goal.name,
            goal.isCompleted ? 'Concluída' : 'Em andamento',
            formatCurrency(goal.currentAmount),
            formatCurrency(goal.targetAmount),
            `${progress.toFixed(1)}%`,
            goal.deadline ? new Date(goal.deadline).toLocaleDateString('pt-BR') : '-',
          ];
        });

        autoTable(doc, {
          startY: yPosition,
          head: [['Meta', 'Status', 'Atual', 'Objetivo', 'Progresso', 'Prazo']],
          body: goalsData,
          theme: 'striped',
          headStyles: { fillColor: [168, 85, 247] },
          margin: { left: 14, right: 14 },
          styles: { fontSize: 9 },
        });
      }

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `FinControl - Relatório Financeiro | Página ${i} de ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }

      // Save
      const fileName = `fincontrol-relatorio-${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast({
        title: "Relatório Exportado!",
        description: `O arquivo ${fileName} foi baixado com sucesso.`,
      });

      setIsOpen(false);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível gerar o relatório. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileDown className="w-4 h-4" />
          Exportar PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Exportar Relatório
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          <p className="text-sm text-muted-foreground">
            Selecione as seções que deseja incluir no relatório PDF:
          </p>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="summary" 
                checked={options.includeSummary}
                onCheckedChange={(checked) => setOptions({ ...options, includeSummary: !!checked })}
              />
              <Label htmlFor="summary" className="cursor-pointer">
                Resumo do Patrimônio
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="investments" 
                checked={options.includeInvestments}
                onCheckedChange={(checked) => setOptions({ ...options, includeInvestments: !!checked })}
              />
              <Label htmlFor="investments" className="cursor-pointer">
                Investimentos ({investments.length})
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="expenses" 
                checked={options.includeExpenses}
                onCheckedChange={(checked) => setOptions({ ...options, includeExpenses: !!checked })}
              />
              <Label htmlFor="expenses" className="cursor-pointer">
                Despesas ({expenses.length})
              </Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Checkbox 
                id="goals" 
                checked={options.includeGoals}
                onCheckedChange={(checked) => setOptions({ ...options, includeGoals: !!checked })}
              />
              <Label htmlFor="goals" className="cursor-pointer">
                Metas Financeiras ({goals.length})
              </Label>
            </div>
          </div>

          <Button 
            onClick={generatePDF} 
            variant="gradient" 
            className="w-full"
            disabled={isGenerating || (!options.includeSummary && !options.includeInvestments && !options.includeExpenses && !options.includeGoals)}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileDown className="w-4 h-4 mr-2" />
                Baixar Relatório PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}