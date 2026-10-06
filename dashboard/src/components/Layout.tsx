import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard, Users, ClipboardList, Wallet,
  BarChart3, LogOut, Menu, X, Package2, ChevronRight, User
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
  const [user, setUser] = useState<{ name: string; businessName: string; role: string } | null>(null);

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

  const currentPage = navItems.find(n => n.href === router.pathname)?.label || 'Dashboard';

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
            <div className="brand-subtitle">Production Manager</div>
          </div>
          <button className="mobile-close-btn" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="nav-section-label">MAIN MENU</div>
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
        </nav>

        {/* User Card & Logout */}
        <div className="sidebar-footer">
          <div className="user-profile-badge">
            <div className="user-avatar-circle">
              <User size={16} />
            </div>
            <div className="user-details">
              <div className="user-name">{user?.name || 'Owner'}</div>
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
