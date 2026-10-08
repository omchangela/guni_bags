import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { sendOtp, verifyOtp, registerUser, adminLogin } from '@/lib/api';
import { Package2, Phone, Shield, Building2, User, Sparkles, Lock, Mail, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'signin' | 'register' | 'admin'>('signin');
  const [step, setStep] = useState<'form' | 'otp'>('form');

  // Business User form states
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState('');

  // Master Admin form states
  const [adminEmail, setAdminEmail] = useState('admin@admin.com');
  const [adminPassword, setAdminPassword] = useState('123456');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const u = JSON.parse(stored);
          if (u.role === 'SUPER_ADMIN') {
            router.push('/admin');
            return;
          }
        } catch {}
      }
      router.push('/');
    }
  }, [router]);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  // Regular user login (User Panel)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile.match(/^\d{10}$/)) { setError('Enter a valid 10-digit mobile number'); return; }
    setLoading(true); setError('');
    try {
      const res = await sendOtp(mobile);
      setSessionId(res.data.data.sessionId);
      setCountdown(60);
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  };

  // Regular business registration (User Panel)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Enter your full name'); return; }
    if (!mobile.match(/^\d{10}$/)) { setError('Enter a valid 10-digit mobile number'); return; }
    setLoading(true); setError('');
    try {
      const res = await registerUser(name.trim(), mobile, '+91', businessName.trim());
      setSessionId(res.data.data.sessionId);
      setCountdown(60);
      setStep('otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register account');
    } finally { setLoading(false); }
  };

  // OTP Verification for Regular Users -> navigates to User Dashboard
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.match(/^\d{4,6}$/)) { setError('Enter a valid OTP'); return; }
    setLoading(true); setError('');
    try {
      const res = await verifyOtp(mobile, otp, sessionId, '+91');
      const { tokens, user } = res.data.data;
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      router.push('/'); // Regular user panel
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error?.details || 'Invalid OTP. Default OTP is 123456';
      setError(msg);
    } finally { setLoading(false); }
  };

  // Master Admin Login (admin@admin.com / 123456) -> navigates to Master Dashboard
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmail.trim()) { setError('Enter master admin email'); return; }
    if (!adminPassword) { setError('Enter master admin password'); return; }
    setLoading(true); setError('');
    try {
      const res = await adminLogin(adminEmail.trim(), adminPassword);
      const { tokens, user } = res.data.data;
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      router.push('/admin'); // Master dashboard
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error?.details || 'Invalid admin email or password';
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <>
      <Head>
        <title>
          {tab === 'admin'
            ? 'Master Admin Portal — Gunny Bags SaaS'
            : tab === 'register'
            ? 'Register Business — Gunny Bags Manager'
            : 'Sign In — Gunny Bags Manager'}
        </title>
        <meta name="description" content="Gunny Bags Production & Worker Management SaaS" />
      </Head>
      <div style={{
        minHeight: '100vh', background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(245,158,11,0.06) 0%, transparent 60%)',
      }}>
        <div style={{ width: '100%', maxWidth: 460 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{
              width: 68, height: 68, borderRadius: 20, margin: '0 auto 16px',
              background: tab === 'admin'
                ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                : 'linear-gradient(135deg, #6366f1, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: tab === 'admin'
                ? '0 20px 40px rgba(245,158,11,0.35)'
                : '0 20px 40px rgba(99,102,241,0.3)',
              transition: 'all 0.3s ease',
            }}>
              {tab === 'admin' ? <ShieldCheck size={34} color="#000" /> : <Package2 size={32} color="white" />}
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 26, color: 'var(--text-primary)', margin: 0 }}>
              Gunny Bags Manager
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              {tab === 'admin' ? 'Master Platform Administration' : 'Business Owner & Worker Management Panel'}
            </p>
          </div>

          <div className="glass-card" style={{ padding: '28px 32px', boxShadow: '0 30px 60px rgba(0,0,0,0.4)', borderRadius: 18 }}>

            {/* STEP 1: FORM (Tabs for User Sign In vs Register vs Master Admin) */}
            {step === 'form' && (
              <>
                {/* 3-Tab Switcher */}
                <div style={{
                  display: 'flex', background: 'rgba(255,255,255,0.04)',
                  padding: 4, borderRadius: 12, marginBottom: 22, border: '1px solid var(--border)'
                }}>
                  <button
                    type="button"
                    onClick={() => { setTab('signin'); setError(''); }}
                    style={{
                      flex: 1, padding: '9px 6px', borderRadius: 9, border: 'none',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: tab === 'signin' ? 'var(--accent)' : 'transparent',
                      color: tab === 'signin' ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    User Login
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTab('register'); setError(''); }}
                    style={{
                      flex: 1, padding: '9px 6px', borderRadius: 9, border: 'none',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: tab === 'register' ? 'var(--accent)' : 'transparent',
                      color: tab === 'register' ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Register
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTab('admin'); setError(''); }}
                    style={{
                      flex: 1.1, padding: '9px 6px', borderRadius: 9, border: 'none',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      background: tab === 'admin' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
                      color: tab === 'admin' ? '#000' : 'var(--amber-light)',
                      transition: 'all 0.2s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    👑 Master Admin
                  </button>
                </div>

                {/* 1. REGULAR USER SIGN IN FORM (Mobile + OTP) */}
                {tab === 'signin' && (
                  <form onSubmit={handleSignIn}>
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Phone size={16} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Business Owner Mobile</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{
                          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                          borderRadius: 10, padding: '11px 14px', fontSize: 14, color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                        }}>+91</div>
                        <input
                          id="signin-mobile"
                          type="tel"
                          maxLength={10}
                          placeholder="Enter your 10-digit mobile"
                          value={mobile}
                          onChange={e => { setMobile(e.target.value.replace(/\D/g, '')); setError(''); }}
                          className="form-input"
                          style={{ flex: 1 }}
                          autoFocus
                          autoComplete="tel"
                        />
                      </div>
                    </div>

                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                      Sign in to manage your factory workers, daily bag production, and worker payouts.
                    </p>

                    {error && (
                      <div style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 8, padding: '9px 12px', marginBottom: 14,
                      }}>
                        <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>⚠ {error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      id="signin-btn"
                      className="btn-primary"
                      disabled={loading}
                      style={{ width: '100%', padding: '13px', fontSize: 15 }}
                    >
                      {loading ? 'Sending OTP...' : 'Send Login OTP →'}
                    </button>
                  </form>
                )}

                {/* 2. REGISTER NEW BUSINESS TENANT */}
                {tab === 'register' && (
                  <form onSubmit={handleRegister}>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={15} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Your Full Name *</span>
                      </div>
                      <input
                        id="register-name"
                        type="text"
                        placeholder="e.g. Om Patel"
                        value={name}
                        onChange={e => { setName(e.target.value); setError(''); }}
                        className="form-input"
                        style={{ width: '100%' }}
                        autoFocus
                        required
                      />
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Building2 size={15} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Business / Factory Name</span>
                      </div>
                      <input
                        id="register-business"
                        type="text"
                        placeholder="e.g. Patel Gunny Bags Trading Co."
                        value={businessName}
                        onChange={e => { setBusinessName(e.target.value); setError(''); }}
                        className="form-input"
                        style={{ width: '100%' }}
                      />
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Phone size={15} style={{ color: 'var(--accent)' }} />
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Mobile Number *</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <div style={{
                          background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                          borderRadius: 10, padding: '11px 14px', fontSize: 14, color: 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                        }}>+91</div>
                        <input
                          id="register-mobile"
                          type="tel"
                          maxLength={10}
                          placeholder="10-digit mobile number"
                          value={mobile}
                          onChange={e => { setMobile(e.target.value.replace(/\D/g, '')); setError(''); }}
                          className="form-input"
                          style={{ flex: 1 }}
                          autoComplete="tel"
                          required
                        />
                      </div>
                    </div>

                    {error && (
                      <div style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 8, padding: '9px 12px', marginBottom: 14,
                      }}>
                        <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>⚠ {error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      id="register-btn"
                      className="btn-primary"
                      disabled={loading}
                      style={{ width: '100%', padding: '13px', fontSize: 15 }}
                    >
                      {loading ? 'Creating account...' : 'Create Business Account →'}
                    </button>
                  </form>
                )}

                {/* 3. MASTER ADMIN LOGIN (admin@admin.com / 123456) */}
                {tab === 'admin' && (
                  <form onSubmit={handleAdminLogin}>
                    <div style={{
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                      borderRadius: 10, padding: '10px 14px', marginBottom: 18,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--amber-light)', fontWeight: 700, fontSize: 12 }}>
                        <ShieldCheck size={14} />
                        <span>MASTER ADMINISTRATOR ACCESS ONLY</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                        Single administrator restricted portal. Access real-time SaaS platform stats and all registered businesses.
                      </div>
                    </div>

                    <div style={{ marginBottom: 14 }}>
                      <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Mail size={15} style={{ color: 'var(--amber)' }} />
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Admin Email</span>
                      </div>
                      <input
                        id="admin-email"
                        type="email"
                        placeholder="admin@admin.com"
                        value={adminEmail}
                        onChange={e => { setAdminEmail(e.target.value); setError(''); }}
                        className="form-input"
                        style={{ width: '100%' }}
                        autoFocus
                        required
                      />
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Lock size={15} style={{ color: 'var(--amber)' }} />
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Admin Password</span>
                      </div>
                      <input
                        id="admin-password"
                        type="password"
                        placeholder="••••••"
                        value={adminPassword}
                        onChange={e => { setAdminPassword(e.target.value); setError(''); }}
                        className="form-input"
                        style={{ width: '100%' }}
                        required
                      />
                    </div>

                    {error && (
                      <div style={{
                        background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                        borderRadius: 8, padding: '9px 12px', marginBottom: 14,
                      }}>
                        <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>⚠ {error}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      id="admin-login-btn"
                      className="btn-primary"
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '13px',
                        fontSize: 15,
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: '#000',
                        fontWeight: 700,
                        boxShadow: '0 4px 18px rgba(245,158,11,0.3)',
                      }}
                    >
                      {loading ? 'Authenticating...' : 'Sign In to Master Dashboard →'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: 14 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        Default Admin: <strong style={{ color: 'var(--amber-light)' }}>admin@admin.com</strong> | Password: <strong style={{ color: 'var(--amber-light)' }}>123456</strong>
                      </span>
                    </div>
                  </form>
                )}
              </>
            )}

            {/* STEP 2: USER OTP VERIFICATION */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Shield size={18} style={{ color: '#10b981' }} />
                  <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>Enter Verification Code</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 10 }}>
                  OTP sent to <strong style={{ color: 'var(--text-primary)' }}>+91 {mobile}</strong>
                </p>

                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '8px 12px', background: 'rgba(99,102,241,0.08)', borderRadius: 10,
                  marginBottom: 16, border: '1px solid rgba(99,102,241,0.25)'
                }}>
                  <Sparkles size={14} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Master OTP:</span>
                  <code style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', letterSpacing: 2 }}>123456</code>
                </div>

                <input
                  id="otp-input"
                  type="text"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                  className="form-input"
                  style={{ fontSize: 26, textAlign: 'center', letterSpacing: 10, width: '100%' }}
                  autoFocus
                  autoComplete="one-time-code"
                />

                {error && (
                  <div style={{
                    background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 8, padding: '9px 12px', marginTop: 12,
                  }}>
                    <p style={{ color: '#f87171', fontSize: 13, margin: 0 }}>⚠ {error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  id="verify-otp-btn"
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', padding: '13px', fontSize: 15, marginTop: 16 }}
                >
                  {loading ? 'Verifying...' : 'Verify & Continue to User Panel →'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => { setStep('form'); setError(''); setOtp(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', padding: 0 }}
                  >
                    ← Change mobile
                  </button>
                  <span style={{
                    fontSize: 13,
                    color: countdown > 0 ? 'var(--text-secondary)' : 'var(--accent)',
                    cursor: countdown > 0 ? 'default' : 'pointer',
                  }}>
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                  </span>
                </div>
              </form>
            )}
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-secondary)', opacity: 0.7 }}>
            Secure Multi-Tenant Cloud Architecture
          </p>
        </div>
      </div>
    </>
  );
}
