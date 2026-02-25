import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, ShieldAlert, CheckCircle } from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";

const Reports = () => {
  const { user } = useAuth();
  const [data, setData] = useState({
    totalTransactions: 0,
    suspiciousCount: 0,
    fraudulentCount: 0,
    normalCount: 0,
    totalInvoices: 0,
    flaggedInvoices: 0,
    totalAlerts: 0,
    resolvedAlerts: 0,
  });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const [tx, inv, alerts] = await Promise.all([
        supabase.from("transactions").select("ml_label").eq("user_id", user.id),
        supabase.from("invoices").select("status").eq("user_id", user.id),
        supabase.from("fraud_alerts").select("is_resolved").eq("user_id", user.id),
      ]);
      const txData = tx.data || [];
      const invData = inv.data || [];
      const alertData = alerts.data || [];
      setData({
        totalTransactions: txData.length,
        suspiciousCount: txData.filter(t => t.ml_label === "suspicious").length,
        fraudulentCount: txData.filter(t => t.ml_label === "fraudulent").length,
        normalCount: txData.filter(t => t.ml_label === "normal").length,
        totalInvoices: invData.length,
        flaggedInvoices: invData.filter(i => i.status === "flagged").length,
        totalAlerts: alertData.length,
        resolvedAlerts: alertData.filter(a => a.is_resolved).length,
      });
    };
    fetch();
  }, [user]);

  const txPie = [
    { name: "Normal", value: data.normalCount || 1, color: "hsl(160, 60%, 45%)" },
    { name: "Suspicious", value: data.suspiciousCount, color: "hsl(38, 92%, 55%)" },
    { name: "Fraudulent", value: data.fraudulentCount, color: "hsl(0, 72%, 51%)" },
  ];

  const summaryBars = [
    { name: "Total TX", value: data.totalTransactions },
    { name: "Flagged Inv", value: data.flaggedInvoices },
    { name: "Active Alerts", value: data.totalAlerts - data.resolvedAlerts },
    { name: "Resolved", value: data.resolvedAlerts },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="page-header">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">System-wide fraud detection analytics</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { label: "Detection Rate", value: data.totalTransactions > 0 ? `${Math.round(((data.suspiciousCount + data.fraudulentCount) / data.totalTransactions) * 100)}%` : "0%", icon: TrendingUp },
            { label: "Flagged Invoices", value: data.flaggedInvoices, icon: ShieldAlert },
            { label: "Total Alerts", value: data.totalAlerts, icon: BarChart3 },
            { label: "Resolution Rate", value: data.totalAlerts > 0 ? `${Math.round((data.resolvedAlerts / data.totalAlerts) * 100)}%` : "N/A", icon: CheckCircle },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
              className="stat-card">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-3xl font-bold mt-1 font-mono">{card.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-5">
            <h3 className="font-semibold mb-4">Transaction Classification</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={txPie} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {txPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(222, 44%, 9%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: "8px", color: "hsl(210, 40%, 93%)" }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-6 mt-2">
              {txPie.map(item => (
                <div key={item.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                  <span className="text-muted-foreground">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card p-5">
            <h3 className="font-semibold mb-4">System Summary</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={summaryBars}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                <XAxis dataKey="name" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} />
                <Tooltip contentStyle={{ background: "hsl(222, 44%, 9%)", border: "1px solid hsl(222, 30%, 18%)", borderRadius: "8px", color: "hsl(210, 40%, 93%)" }} />
                <Bar dataKey="value" fill="hsl(174, 62%, 47%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
