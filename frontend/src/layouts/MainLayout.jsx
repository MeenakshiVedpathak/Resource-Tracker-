import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';

const MainLayout = () => (
  <div className="flex h-screen overflow-hidden bg-background">
    <Sidebar />
    <div className="flex flex-1 flex-col overflow-hidden min-w-0">
      <Topbar />
      <main className="flex-1 overflow-y-auto flex flex-col">
        <div className="mx-auto max-w-screen-2xl px-6 pt-6 pb-8 flex-1 w-full">
          <Outlet />
        </div>
        <footer className="w-full text-center py-4 text-xs font-medium text-muted-foreground border-t bg-slate-50/50">
          Designed and developed by GTT Data solutions
        </footer>
      </main>
    </div>
  </div>
);

export default MainLayout;
