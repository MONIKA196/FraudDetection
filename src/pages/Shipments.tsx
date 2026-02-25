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
import { Plus, Truck, AlertTriangle, CheckCircle, Clock } from "lucide-react";

const Shipments = () => {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    supplier_id: "", tracking_number: "", expected_quantity: "", received_quantity: "",
    shipped_date: "", delivery_date: ""
  });

  const fetchData = async () => {
    if (!user) return;
    const [sh, sup] = await Promise.all([
      supabase.from("shipments").select("*, suppliers(name)").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("suppliers").select("id, name").eq("user_id", user.id),
    ]);
    setShipments(sh.data || []);
    setSuppliers(sup.data || []);
  };

  useEffect(() => { fetchData(); }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const expected = parseInt(form.expected_quantity) || 0;
    const received = parseInt(form.received_quantity) || 0;
    let fraudScore = 0;
    let status: string = "in_transit";

    if (received > 0 && expected > 0) {
      const deviation = Math.abs(expected - received) / expected;
      if (deviation > 0.15) fraudScore += 40;
      if (received > expected * 1.3) fraudScore += 30;
      status = fraudScore > 50 ? "flagged" : "delivered";
    }

    const { error } = await supabase.from("shipments").insert({
      user_id: user!.id,
      supplier_id: form.supplier_id || null,
      tracking_number: form.tracking_number.trim() || null,
      expected_quantity: expected || null,
      received_quantity: received || null,
      shipped_date: form.shipped_date || null,
      delivery_date: form.delivery_date || null,
      fraud_score: fraudScore,
      status,
    });
    if (error) { toast.error(error.message); return; }

    if (fraudScore > 50) {
      await supabase.from("fraud_alerts").insert({
        user_id: user!.id,
        entity_type: "shipment",
        entity_id: crypto.randomUUID(),
        alert_type: "Quantity Manipulation",
        severity: fraudScore > 70 ? "high" : "medium",
        description: `Shipment ${form.tracking_number} flagged. Expected: ${expected}, Received: ${received}.`,
      });
    }

    toast.success("Shipment added");
    setForm({ supplier_id: "", tracking_number: "", expected_quantity: "", received_quantity: "", shipped_date: "", delivery_date: "" });
    setOpen(false);
    fetchData();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "delivered": return <span className="badge-safe">Delivered</span>;
      case "flagged": return <span className="badge-fraud">Flagged</span>;
      case "delayed": return <span className="badge-warning">Delayed</span>;
      default: return <span className="badge-warning">In Transit</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header">Shipments</h1>
            <p className="text-muted-foreground text-sm mt-1">Track deliveries and detect quantity manipulation</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Shipment</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader><DialogTitle>Add Shipment</DialogTitle></DialogHeader>
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
                  <Label>Tracking Number</Label>
                  <Input value={form.tracking_number} onChange={e => setForm({...form, tracking_number: e.target.value})} className="bg-secondary/50" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Expected Qty</Label>
                    <Input type="number" value={form.expected_quantity} onChange={e => setForm({...form, expected_quantity: e.target.value})} className="bg-secondary/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Received Qty</Label>
                    <Input type="number" value={form.received_quantity} onChange={e => setForm({...form, received_quantity: e.target.value})} className="bg-secondary/50" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Shipped Date</Label>
                    <Input type="date" value={form.shipped_date} onChange={e => setForm({...form, shipped_date: e.target.value})} className="bg-secondary/50" />
                  </div>
                  <div className="space-y-2">
                    <Label>Delivery Date</Label>
                    <Input type="date" value={form.delivery_date} onChange={e => setForm({...form, delivery_date: e.target.value})} className="bg-secondary/50" />
                  </div>
                </div>
                <Button type="submit" className="w-full">Add Shipment</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {shipments.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No shipments yet.</p>
            </div>
          ) : (
            shipments.map((sh, i) => (
              <motion.div key={sh.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass-card p-4 flex items-center gap-4">
                <Truck className="w-5 h-5 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold font-mono">{sh.tracking_number || "No tracking"}</p>
                    {statusBadge(sh.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {sh.suppliers?.name || "Unknown"} • Exp: {sh.expected_quantity || "—"} / Rcv: {sh.received_quantity || "—"}
                  </p>
                </div>
                <span className="font-mono text-sm text-muted-foreground">
                  Score: <span className={Number(sh.fraud_score) > 50 ? "text-destructive" : "text-success"}>{Number(sh.fraud_score)}%</span>
                </span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Shipments;
