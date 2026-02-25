import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  LayoutDashboard, Users, FileText, Truck, CreditCard,
  AlertTriangle, LogOut, Shield, BarChart3
} from "lucide-react";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/suppliers", icon: Users, label: "Suppliers" },
  { to: "/invoices", icon: FileText, label: "Invoices" },
  { to: "/shipments", icon: Truck, label: "Shipments" },
  { to: "/transactions", icon: CreditCard, label: "Transactions" },
  { to: "/alerts", icon: AlertTriangle, label: "Fraud Alerts" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
];

const Sidebar = () => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <aside className="w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col fixed left-0 top-0 z-30">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-foreground text-lg leading-none">ShieldChain</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Fraud Detection</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `nav-item ${isActive ? "active" : ""}`
            }
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button onClick={handleSignOut} className="nav-item w-full text-destructive hover:text-destructive">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
