import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { motion } from "framer-motion";
import {
  AlertTriangle, Users, FileText, Truck, TrendingUp,
  ShieldAlert, CheckCircle, XCircle
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar
} from "recharts";

const fraudTrendData = [
  { month: "Jan", normal: 120, suspicious: 8, fraudulent: 2 },
  { month: "Feb", normal: 135, suspicious: 12, fraudulent: 3 },
  { month: "Mar", normal: 148, suspicious: 6, fraudulent: 1 },
  { month: "Apr", normal: 162, suspicious: 15, fraudulent: 5 },
  { month: "May", normal: 155, suspicious: 10, fraudulent: 4 },
  { month: "Jun", normal: 170, suspicious: 18, fraudulent: 6 },
];

const riskDistribution = [
  { name: "Low Risk", value: 68, color: "hsl(160, 60%, 45%)" },
  { name: "Medium Risk", value: 22, color: "hsl(38, 92%, 55%)" },
  { name: "High Risk", value: 10, color: "hsl(0, 72%, 51%)" },
];

const supplierRiskData = [
  { name: "Tier 1", risk: 12 },
  { name: "Tier 2", risk: 28 },
  { name: "Tier 3", risk: 45 },
  { name: "Tier 4", risk: 65 },
];

const Dashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    suppliers: 0,
    invoices: 0,
    shipments: 0,
    alerts: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const [suppliers, invoices, shipments, alerts] = await Promise.all([
        supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("invoices").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("shipments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("fraud_alerts").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_resolved", false),
      ]);
      setStats({
        suppliers: suppliers.count || 0,
        invoices: invoices.count || 0,
        shipments: shipments.count || 0,
        alerts: alerts.count || 0,
      });
    };
    const fetchAlerts = async () => {
      const { data } = await supabase
        .from("fraud_alerts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentAlerts(data || []);
    };
    fetchStats();
    fetchAlerts();
  }, [user]);

  const statCards = [
    { label: "Total Suppliers", value: stats.suppliers, icon: Users, variant: "" },
    { label: "Active Invoices", value: stats.invoices, icon: FileText, variant: "accent-card" },
    { label: "Shipments", value: stats.shipments, icon: Truck, variant: "" },
    { label: "Active Alerts", value: stats.alerts, icon: AlertTriangle, variant: "danger-card" },
  ];

  const severityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <XCircle className="w-4 h-4 text-destructive" />;
      case "high": return <ShieldAlert className="w-4 h-4 text-destructive" />;
      case "medium": return <AlertTriangle className="w-4 h-4 text-warning" />;
      default: return <CheckCircle className="w-4 h-4 text-success" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="page-header">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">Supply chain fraud detection overview</p>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`stat-card ${card.variant}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-3xl font-bold mt-1 font-mono">{card.value}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                  <card.icon className="w-6 h-6 text-muted-foreground" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-5 lg:col-span-2"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              Fraud Trend Analysis
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={fraudTrendData}>
                <defs>
                  <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(174, 62%, 47%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(174, 62%, 47%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSuspicious" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38, 92%, 55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(38, 92%, 55%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFraud" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0, 72%, 51%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                <XAxis dataKey="month" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(222, 44%, 9%)",
                    border: "1px solid hsl(222, 30%, 18%)",
                    borderRadius: "8px",
                    color: "hsl(210, 40%, 93%)",
                  }}
                />
                <Area type="monotone" dataKey="normal" stroke="hsl(174, 62%, 47%)" fillOpacity={1} fill="url(#colorNormal)" />
                <Area type="monotone" dataKey="suspicious" stroke="hsl(38, 92%, 55%)" fillOpacity={1} fill="url(#colorSuspicious)" />
                <Area type="monotone" dataKey="fraudulent" stroke="hsl(0, 72%, 51%)" fillOpacity={1} fill="url(#colorFraud)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-5"
          >
            <h3 className="font-semibold mb-4">Risk Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={riskDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {riskDistribution.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(222, 44%, 9%)",
                    border: "1px solid hsl(222, 30%, 18%)",
                    borderRadius: "8px",
                    color: "hsl(210, 40%, 93%)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {riskDistribution.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
                    <span className="text-muted-foreground">{item.name}</span>
                  </div>
                  <span className="font-mono font-semibold">{item.value}%</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-card p-5"
          >
            <h3 className="font-semibold mb-4">Supplier Risk by Tier</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={supplierRiskData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 30%, 18%)" />
                <XAxis dataKey="name" stroke="hsl(215, 20%, 55%)" fontSize={12} />
                <YAxis stroke="hsl(215, 20%, 55%)" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(222, 44%, 9%)",
                    border: "1px solid hsl(222, 30%, 18%)",
                    borderRadius: "8px",
                    color: "hsl(210, 40%, 93%)",
                  }}
                />
                <Bar dataKey="risk" fill="hsl(38, 92%, 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="glass-card p-5"
          >
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Recent Alerts
            </h3>
            {recentAlerts.length === 0 ? (
              <p className="text-muted-foreground text-sm">No alerts yet. Add data to start detecting fraud.</p>
            ) : (
              <div className="space-y-3">
                {recentAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    {severityIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{alert.alert_type}</p>
                      <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
                    </div>
                    <span className={`text-xs font-mono ${
                      alert.severity === "critical" ? "text-destructive" :
                      alert.severity === "high" ? "text-destructive" :
                      alert.severity === "medium" ? "text-warning" : "text-success"
                    }`}>
                      {alert.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
