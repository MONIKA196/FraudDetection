import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Plus, FileText, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";

const Invoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    supplier_id: "", invoice_number: "", amount: "", expected_amount: "", issue_date: "", due_date: ""
  });

  const fetch = async () => {
    if (!user) return;
    const [inv, sup] = await Promise.all([
      supabase.from("invoices").select("*, suppliers(name)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("suppliers").select("id, name").eq("user_id", user.id),
    ]);
    setInvoices(inv.data || []);
    setSuppliers(sup.data || []);
  };

  useEffect(() => { fetch(); }, [user]);

  const runFraudCheck = (amount: number, expectedAmount: number | null) => {
    let score = 0;
    if (expectedAmount && Math.abs(amount - expectedAmount) / expectedAmount > 0.2) score += 40;
    if (amount > 50000) score += 20;
    if (expectedAmount && amount > expectedAmount * 1.5) score += 30;
    return Math.min(score, 100);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.invoice_number.trim() || !form.amount) { toast.error("Fill required fields"); return; }
    const amount = parseFloat(form.amount);
    const expectedAmount = form.expected_amount ? parseFloat(form.expected_amount) : null;
    const fraudScore = runFraudCheck(amount, expectedAmount);
    const status = fraudScore > 50 ? "flagged" : "pending";

    const { error } = await supabase.from("invoices").insert({
      user_id: user!.id,
      supplier_id: form.supplier_id || null,
      invoice_number: form.invoice_number.trim(),
      amount,
      expected_amount: expectedAmount,
      issue_date: form.issue_date || new Date().toISOString().split("T")[0],
      due_date: form.due_date || null,
      fraud_score: fraudScore,
      status,
    });
    if (error) { toast.error(error.message); return; }

    if (fraudScore > 50) {
      await supabase.from("fraud_alerts").insert({
        user_id: user!.id,
        entity_type: "invoice",
        entity_id: crypto.randomUUID(),
        alert_type: "Invoice Mismatch",
        severity: fraudScore > 70 ? "high" : "medium",
        description: `Invoice ${form.invoice_number} flagged with fraud score ${fraudScore}%. Amount deviation detected.`,
      });
    }

    toast.success(fraudScore > 50 ? "Invoice added & flagged for review!" : "Invoice added");
    setForm({ supplier_id: "", invoice_number: "", amount: "", expected_amount: "", issue_date: "", due_date: "" });
    setOpen(false);
    fetch();
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="w-4 h-4 text-success" />;
      case "flagged": return <AlertTriangle className="w-4 h-4 text-warning" />;
      case "rejected": return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header">Invoices</h1>
            <p className="text-muted-foreground text-sm mt-1">Track invoices with automated fraud scoring</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Invoice</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Add New Invoice</DialogTitle></DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Select value={form.supplier_id} onValueChange={v => setForm({...form, supplier_id: v})}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Invoice Number *</Label>
                  <Input value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})} className="bg-secondary/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Amount *</Label>
                    <Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="bg-secondary/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Expected Amount</Label>
                    <Input type="number" value={form.expected_amount} onChange={e => setForm({...form, expected_amount: e.target.value})} className="bg-secondary/50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Issue Date</Label>
                    <Input type="date" value={form.issue_date} onChange={e => setForm({...form, issue_date: e.target.value})} className="bg-secondary/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} className="bg-secondary/50" />
                  </div>
                </div>
                <Button type="submit" className="w-full">Add Invoice</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {invoices.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No invoices yet.</p>
            </div>
          ) : (
            invoices.map((inv, i) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-4 flex items-center gap-4"
              >
                {statusIcon(inv.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold font-mono">{inv.invoice_number}</p>
                    {Number(inv.fraud_score) > 50 && <span className="badge-fraud">Flagged</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {inv.suppliers?.name || "Unknown Supplier"} • {inv.issue_date}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold">${Number(inv.amount).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    Score: <span className={Number(inv.fraud_score) > 50 ? "text-destructive" : "text-success"}>
                      {Number(inv.fraud_score)}%
                    </span>
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Invoices;
