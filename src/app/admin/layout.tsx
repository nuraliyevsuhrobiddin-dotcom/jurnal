'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  BookMarked,
  Users,
  Award,
  Settings,
  History,
  FileUp,
  Globe,
  Menu,
  X,
  ShieldCheck,
  Mail,
  LogOut
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const [logoutError, setLogoutError] = useState(false);
  async function logout() {
    try {
      const response = await fetch('/api/admin/session', { method: 'DELETE' });
      if (!response.ok) throw new Error('Logout failed');
      router.push('/admin/login');
      router.refresh();
    } catch { setLogoutError(true); }
  }

  // If on admin login page, don't show full dashboard layout
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  const menuItems = [
    { href: '/admin/messages', label: 'Murojaatlar', icon: Mail },
    { href: '/admin', label: 'Boshqaruv paneli', icon: LayoutDashboard },
    { href: '/admin/articles', label: 'Maqolalar ro‘yxati', icon: FileText },
    { href: '/admin/articles/new', label: 'Yangi maqola qo‘shish', icon: PlusCircle },
    { href: '/admin/issues', label: 'Jurnal sonlari', icon: BookMarked },
    { href: '/admin/editorial-board', label: 'Tahririyat a’zolari', icon: Users },
    { href: '/admin/certificates', label: 'Sertifikatlar', icon: Award },
    { href: '/admin/pdf-generator', label: 'DOCX / PDF generator', icon: FileUp },
    { href: '/admin/audit-logs', label: 'Audit jurnali', icon: History },
    { href: '/admin/settings', label: 'Jurnal sozlamalari', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row font-sans">
      {/* Mobile Top Bar */}
      <div className="md:hidden bg-navy-900 text-white p-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-gold-400" />
          <span className="font-bold text-sm">AGM Journal Admin</span>
        </div>
        <button
          aria-label="Boshqaruv menyusi"
          aria-expanded={sidebarOpen}
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 rounded text-slate-300 hover:text-white"
        >
          {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {sidebarOpen && <button aria-label="Menyuni yopish" className="fixed inset-0 z-30 bg-slate-950/50 md:hidden" onClick={() => setSidebarOpen(false)} />}
      {/* Sidebar Navigation */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-40 w-64 shrink-0 md:sticky md:top-0 md:h-screen overflow-y-auto bg-navy-950 text-slate-300 flex flex-col justify-between transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          {/* Logo */}
          <div className="p-6 border-b border-slate-800">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gold-500 flex items-center justify-center text-navy-900 shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-base font-extrabold text-white block leading-none">
                  AGM ADMIN
                </span>
                <span className="text-[10px] text-gold-400 font-mono tracking-wider">
                  Superadmin Portal
                </span>
              </div>
            </Link>
          </div>

          {/* Nav Links */}
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-navy-800 text-white shadow-sm'
                      : 'hover:bg-slate-800/60 hover:text-white text-slate-400'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-gold-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <button onClick={logout} aria-label="Admin hisobidan chiqish" className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800/40 rounded-lg">
            <LogOut className="w-4 h-4" /><span>Hisobdan chiqish</span>
          </button>
          {logoutError && <p role="alert" className="text-sm text-red-300 px-3">Chiqish amalga oshmadi. Qayta urinib ko‘ring.</p>}
          <Link
            href="/uz"
            target="_blank"
            className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800/40 rounded-lg transition-colors"
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            <span>Saytni ko‘rish (Public)</span>
          </Link>
          <div className="px-3 py-2 text-[11px] text-slate-400 font-mono">
            Tizim versiyasi: v1.0.0-prod
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 p-4 sm:p-8 lg:p-10 overflow-y-auto">
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  );
}
