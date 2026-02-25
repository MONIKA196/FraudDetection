import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle, XCircle, ShieldAlert, Bell } from "lucide-react";

const Alerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);

  const fetchAlerts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("fraud_alerts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAlerts(data || []);
  };

  useEffect(() => { fetchAlerts(); }, [user]);

  const resolve = async (id: string) => {
    await supabase.from("fraud_alerts").update({ is_resolved: true, resolved_at: new Date().toISOString() }).eq("id", id);
    toast.success("Alert resolved");
    fetchAlerts();
  };

  const severityColor = (s: string) => {
    switch (s) {
      case "critical": return "border-l-destructive";
      case "high": return "border-l-destructive";
      case "medium": return "border-l-warning";
      default: return "border-l-success";
    }
  };

  const severityIcon = (s: string) => {
    switch (s) {
      case "critical": return <XCircle className="w-5 h-5 text-destructive" />;
      case "high": return <ShieldAlert className="w-5 h-5 text-destructive" />;
      case "medium": return <AlertTriangle className="w-5 h-5 text-warning" />;
      default: return <CheckCircle className="w-5 h-5 text-success" />;
    }
  };

  const active = alerts.filter(a => !a.is_resolved);
  const resolved = alerts.filter(a => a.is_resolved);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="page-header">Fraud Alerts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {active.length} active alert{active.length !== 1 ? "s" : ""} requiring attention
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Bell className="w-4 h-4 text-warning animate-pulse-glow" /> Active Alerts
            </h2>
            {active.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <CheckCircle className="w-10 h-10 text-success mx-auto mb-2" />
                <p className="text-muted-foreground">All clear — no active alerts.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {active.map((a, i) => (
                  <motion.div key={a.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className={`glass-card p-4 border-l-4 ${severityColor(a.severity)} flex items-start gap-4`}>
                    {severityIcon(a.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{a.alert_type}</p>
                        <span className={`text-xs font-mono uppercase ${
                          a.severity === "critical" || a.severity === "high" ? "text-destructive" : "text-warning"
                        }`}>{a.severity}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{a.description}</p>
                      <p className="text-xs text-muted-foreground mt-2 font-mono">
                        {a.entity_type} • {new Date(a.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => resolve(a.id)}>Resolve</Button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {resolved.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Resolved ({resolved.length})</h2>
              <div className="space-y-2">
                {resolved.slice(0, 10).map((a) => (
                  <div key={a.id} className="glass-card p-3 opacity-60 flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-success" />
                    <span className="text-sm">{a.alert_type}</span>
                    <span className="text-xs text-muted-foreground ml-auto font-mono">
                      {new Date(a.resolved_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Alerts;
