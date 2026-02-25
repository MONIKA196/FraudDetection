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
import { Plus, Search, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";

const Suppliers = () => {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", contact_email: "", phone: "", address: "" });

  const fetchSuppliers = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("suppliers")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setSuppliers(data || []);
  };

  useEffect(() => { fetchSuppliers(); }, [user]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    const { error } = await supabase.from("suppliers").insert({
      user_id: user!.id,
      name: form.name.trim(),
      contact_email: form.contact_email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Supplier added");
    setForm({ name: "", contact_email: "", phone: "", address: "" });
    setOpen(false);
    fetchSuppliers();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("suppliers").update({ status }).eq("id", id);
    fetchSuppliers();
    toast.success(`Supplier ${status}`);
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const statusIcon = (status: string) => {
    switch (status) {
      case "active": return <ShieldCheck className="w-4 h-4 text-success" />;
      case "suspended": return <ShieldAlert className="w-4 h-4 text-warning" />;
      case "blacklisted": return <ShieldX className="w-4 h-4 text-destructive" />;
      default: return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header">Suppliers</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage and monitor your supply chain partners</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Supplier</Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border">
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.contact_email} onChange={e => setForm({...form, contact_email: e.target.value})} className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="bg-secondary/50" />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="bg-secondary/50" />
                </div>
                <Button type="submit" className="w-full">Add Supplier</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search suppliers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-secondary/50"
          />
        </div>

        <div className="grid gap-3">
          {filtered.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <p className="text-muted-foreground">No suppliers found. Add your first supplier to get started.</p>
            </div>
          ) : (
            filtered.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-4 flex items-center gap-4"
              >
                {statusIcon(s.status)}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{s.contact_email || "No email"} • {s.phone || "No phone"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-muted-foreground">Risk: {Number(s.risk_score).toFixed(0)}%</span>
                  <Select value={s.status} onValueChange={(val) => updateStatus(s.id, val)}>
                    <SelectTrigger className="w-32 bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                      <SelectItem value="blacklisted">Blacklisted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Suppliers;
