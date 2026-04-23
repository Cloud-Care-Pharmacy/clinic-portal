import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { MuiThemeProvider } from "@/components/providers/MuiThemeProvider";
import { SidebarStateProvider } from "@/components/providers/SidebarProvider";
import { BreadcrumbProvider } from "@/components/providers/BreadcrumbProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  return (
    <QueryProvider>
      <MuiThemeProvider>
        <SidebarStateProvider>
          <BreadcrumbProvider>
            <div className="flex h-screen overflow-hidden bg-sidebar">
              <Sidebar user={user} />
              <div className="flex flex-1 flex-col overflow-hidden rounded-l-2xl border-t border-border bg-background shadow-sm my-2 mr-2">
                <Header />
                <main className="flex-1 overflow-y-auto px-4 py-6">{children}</main>
              </div>
            </div>
          </BreadcrumbProvider>
        </SidebarStateProvider>
      </MuiThemeProvider>
    </QueryProvider>
  );
}
