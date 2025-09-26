import { Navigation } from "~/components/Navigation";
import { cn } from "~/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
}

export function DashboardLayout({ children, title, subtitle, className }: DashboardLayoutProps) {
  return (
    <div className="dashboard-layout">
      <Navigation />
      <main className="dashboard-main">
        {title && (
          <header className="dashboard-header">
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
          </header>
        )}
        <div className={cn("dashboard-content", className)}>
          {children}
        </div>
      </main>
    </div>
  );
}
