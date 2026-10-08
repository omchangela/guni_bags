import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { sendOtp, verifyOtp, registerUser } from '@/lib/api';
import { Package2, Phone, Shield, Building2, User, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'signin' | 'register'>('signin');
  const [step, setStep] = useState<'form' | 'otp'>('form');

  // Form states
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) router.push('/');
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

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
      router.push('/');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error?.details || 'Invalid OTP. Default OTP is 123456';
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <>
      <Head>
        <title>{tab === 'signin' ? 'Sign In' : 'Register Business'} — Gunny Bags Manager SaaS</title>
        <meta name="description" content="Multi-tenant Gunny Bags Production & Worker Management Platform" />
      </Head>
      <div style={{
        minHeight: '100vh', background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(245,158,11,0.06) 0%, transparent 60%)',
      }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              width: 68, height: 68, borderRadius: 20, margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #6366f1, #f59e0b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 20px 40px rgba(99,102,241,0.3)',
            }}>
              <Package2 size={32} color="white" />
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 28, color: 'var(--text-primary)', margin: 0 }}>
              Gunny Bags Manager
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>
              Cloud Business & Worker Management Platform
            </p>
          </div>

          <div className="glass-card" style={{ padding: 32, boxShadow: '0 30px 60px rgba(0,0,0,0.4)', borderRadius: 18 }}>

            {/* STEP 1: FORM (Tabs for Sign In vs Register) */}
            {step === 'form' && (
              <>
                {/* Tab Switcher */}
                <div style={{
                  display: 'flex', background: 'rgba(255,255,255,0.04)',
                  padding: 4, borderRadius: 12, marginBottom: 24, border: '1px solid var(--border)'
                }}>
                  <button
                    type="button"
                    onClick={() => { setTab('signin'); setError(''); }}
                    style={{
                      flex: 1, padding: '9px 12px', borderRadius: 9, border: 'none',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: tab === 'signin' ? 'var(--accent)' : 'transparent',
                      color: tab === 'signin' ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTab('register'); setError(''); }}
                    style={{
                      flex: 1, padding: '9px 12px', borderRadius: 9, border: 'none',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      background: tab === 'register' ? 'var(--accent)' : 'transparent',
                      color: tab === 'register' ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    Register Business
                  </button>
                </div>

                {/* SIGN IN FORM */}
                {tab === 'signin' && (
                  <form onSubmit={handleSignIn}>
                    <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Phone size={16} style={{ color: 'var(--accent)' }} />
                      <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Mobile Number</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
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

                {/* REGISTER BUSINESS FORM */}
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
                        placeholder="e.g. Varun Agravat"
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
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>Business Name</span>
                      </div>
                      <input
                        id="register-business"
                        type="text"
                        placeholder="e.g. Agravat Gunny Bags Trading Co."
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
              </>
            )}

            {/* STEP 2: OTP VERIFICATION */}
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
                  {loading ? 'Verifying...' : 'Verify & Continue to Dashboard →'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => { setStep('form'); setError(''); setOtp(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', padding: 0 }}
                  >
                    ← Change details
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
            Secure Multi-Tenant Cloud Infrastructure
          </p>
        </div>
      </div>
    </>
  );
}
