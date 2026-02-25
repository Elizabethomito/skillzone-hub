import { Outlet } from 'react-router-dom';
import Header from '@/components/Header';

export default function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-border bg-card py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} SkillZone. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
