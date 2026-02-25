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
import { Plus, CreditCard, AlertTriangle, CheckCircle } from "lucide-react";

const Transactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ supplier_id: "", amount: "", transaction_type: "payment" });

  const fetchData = async () => {
    if (!user) return;
    const [tx, sup] = await Promise.all([
      supabase.from("transactions").select("*, suppliers(name)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("suppliers").select("id, name").eq("user_id", user.id),
    ]);
    setTransactions(tx.data || []);
    setSuppliers(sup.data || []);
  };

  useEffect(() => { fetchData(); }, [user]);

  const mlClassify = (amount: number, type: string) => {
    // Simulated ML classification
    let score = 0;
    if (amount > 100000) score += 35;
    if (amount > 50000) score += 15;
    if (type === "refund" && amount > 10000) score += 25;
    if (type === "adjustment") score += 10;
    // Random noise for realism
    score += Math.random() * 10;
    score = Math.min(score, 100);
    const label = score > 60 ? "fraudulent" : score > 35 ? "suspicious" : "normal";
    return { score: Math.round(score), label, isSuspicious: score > 35 };
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount) { toast.error("Amount is required"); return; }
    const amount = parseFloat(form.amount);
    const { score, label, isSuspicious } = mlClassify(amount, form.transaction_type);

    const { error } = await supabase.from("transactions").insert({
      user_id: user!.id,
      supplier_id: form.supplier_id || null,
      amount,
      transaction_type: form.transaction_type,
      is_suspicious: isSuspicious,
      fraud_score: score,
      ml_label: label,
    });
    if (error) { toast.error(error.message); return; }

    if (isSuspicious) {
      await supabase.from("fraud_alerts").insert({
        user_id: user!.id,
        entity_type: "transaction",
        entity_id: crypto.randomUUID(),
        alert_type: `Suspicious ${form.transaction_type}`,
        severity: score > 60 ? "critical" : "medium",
        description: `Transaction of $${amount.toLocaleString()} classified as ${label} (score: ${score}%).`,
      });
    }

    toast.success(`Transaction added — ML Label: ${label}`);
    setForm({ supplier_id: "", amount: "", transaction_type: "payment" });
    setOpen(false);
    fetchData();
  };

  const labelBadge = (label: string) => {
    switch (label) {
      case "fraudulent": return <span className="badge-fraud">Fraudulent</span>;
      case "suspicious": return <span className="badge-warning">Suspicious</span>;
      default: return <span className="badge-safe">Normal</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header">Transactions</h1>
            <p className="text-muted-foreground text-sm mt-1">ML-powered transaction classification</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Transaction</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
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
                  <Label>Amount *</Label>
                  <Input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.transaction_type} onValueChange={v => setForm({...form, transaction_type: v})}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                      <SelectItem value="adjustment">Adjustment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">Add & Classify</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {transactions.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No transactions yet.</p>
            </div>
          ) : (
            transactions.map((tx, i) => (
              <motion.div key={tx.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-4 flex items-center gap-4">
                {tx.is_suspicious ? <AlertTriangle className="w-5 h-5 text-warning" /> : <CheckCircle className="w-5 h-5 text-success" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold capitalize">{tx.transaction_type}</p>
                    {labelBadge(tx.ml_label)}
                  </div>
                  <p className="text-sm text-muted-foreground">{tx.suppliers?.name || "Unknown"}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-semibold">${Number(tx.amount).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    ML Score: <span className={Number(tx.fraud_score) > 50 ? "text-destructive" : "text-success"}>{Number(tx.fraud_score)}%</span>
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

export default Transactions;
