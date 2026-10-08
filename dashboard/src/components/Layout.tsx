import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard, Users, ClipboardList, Wallet,
  BarChart3, LogOut, Menu, X, Package2, ChevronRight, User, ShieldCheck
} from 'lucide-react';

const navItems = [
  { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/employees', icon: Users, label: 'Workers' },
  { href: '/work-entries', icon: ClipboardList, label: 'Work Entries' },
  { href: '/payouts', icon: Wallet, label: 'Payouts' },
  { href: '/reports', icon: BarChart3, label: 'Reports & Ledger' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ name: string; businessName: string; role: string; mobile?: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const currentPage =
    router.pathname === '/admin'
      ? 'Master Admin Dashboard'
      : navItems.find(n => n.href === router.pathname)?.label || 'Dashboard';

  return (
    <div className="dashboard-root">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Package2 size={22} color="white" />
          </div>
          <div className="brand-info">
            <div className="brand-title">Gunny Bags</div>
            <div className="brand-subtitle">{isSuperAdmin ? 'Master SaaS Control' : 'Production Manager'}</div>
          </div>
          <button className="mobile-close-btn" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">{isSuperAdmin ? 'TENANT VIEW' : 'MAIN MENU'}</div>
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = router.pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <div className="nav-icon-wrap">
                  <Icon size={18} />
                </div>
                <span className="nav-label">{label}</span>
                {isActive && <ChevronRight size={14} className="nav-chevron" />}
              </Link>
            );
          })}

          {isSuperAdmin && (
            <>
              <div className="nav-section-label" style={{ marginTop: 22, color: 'var(--amber-light)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>MASTER DASHBOARD</span>
              </div>
              <Link
                href="/admin"
                className={`nav-link ${router.pathname === '/admin' ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
                style={router.pathname === '/admin' ? {
                  background: 'rgba(245, 158, 11, 0.16)',
                  borderLeft: '3px solid var(--amber)',
                } : undefined}
              >
                <div className="nav-icon-wrap" style={{ color: 'var(--amber)' }}>
                  <ShieldCheck size={18} />
                </div>
                <span className="nav-label" style={{ fontWeight: 600, color: router.pathname === '/admin' ? 'var(--amber-light)' : undefined }}>
                  All Users Master Data
                </span>
                <span style={{
                  marginLeft: 'auto',
                  fontSize: 10,
                  background: 'var(--amber)',
                  color: '#000',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: 4,
                  letterSpacing: '0.5px'
                }}>
                  SUPER
                </span>
              </Link>
            </>
          )}
        </nav>

        {/* User Card & Logout */}
        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <div className="user-avatar-circle" style={isSuperAdmin ? { borderColor: 'var(--amber)', background: 'rgba(245, 158, 11, 0.2)' } : undefined}>
              {isSuperAdmin ? <ShieldCheck size={16} color="var(--amber)" /> : <User size={16} />}
            </div>
            <div className="user-details">
              <div className="user-name" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{user?.name || 'Owner'}</span>
                {isSuperAdmin && (
                  <span style={{ fontSize: 9, background: 'var(--amber)', color: '#000', fontWeight: 700, padding: '1px 4px', borderRadius: 3 }}>
                    ADMIN
                  </span>
                )}
              </div>
              <div className="user-role">{user?.businessName || 'Trading Co.'}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="dashboard-main-area">
        {/* Top Header */}
        <header className="dashboard-topbar">
          <div className="topbar-left">
            <button
              className="mobile-menu-trigger"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open Navigation"
            >
              <Menu size={20} />
            </button>
            <div>
              <h1 className="page-heading">{currentPage}</h1>
              <p className="page-date">
                {new Date().toLocaleDateString('en-IN', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="topbar-right">
            <div className="live-status-pill">
              <span className="live-dot" />
              <span>System Live</span>
            </div>
          </div>
        </header>

        {/* Main Content View */}
        <main className="dashboard-content-view">
          {children}
        </main>
      </div>
    </div>
  );
}
