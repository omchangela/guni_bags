import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { sendOtp, verifyOtp, registerUser } from '@/lib/api';
import { Package2, Phone, Shield, User, ArrowRight, UserPlus, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
  
  // Login form state
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [notRegistered, setNotRegistered] = useState(false);

  // Register form state (Name and Mobile)
  const [regName, setRegName] = useState('');
  const [regMobile, setRegMobile] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile.match(/^\d{10}$/)) { setError('Enter a valid 10-digit mobile number'); return; }
    setLoading(true); setError(''); setNotRegistered(false); setSuccessMsg('');
    try {
      const res = await sendOtp(mobile);
      setSessionId(res.data.data.sessionId);
      setCountdown(60);
      setStep('otp');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send OTP';
      const code = err.response?.data?.error?.code;
      setError(msg);
      if (code === 'NOT_REGISTERED' || msg.toLowerCase().includes('register first') || err.response?.status === 404) {
        setNotRegistered(true);
      }
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.match(/^\d{4,6}$/)) { setError('Enter a valid OTP'); return; }
    setLoading(true); setError('');
    try {
      const res = await verifyOtp(mobile, otp, sessionId);
      const { tokens, user } = res.data.data;
      localStorage.setItem('accessToken', tokens.accessToken);
      localStorage.setItem('refreshToken', tokens.refreshToken);
      localStorage.setItem('user', JSON.stringify(user));
      router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim()) { setError('Please enter your full name'); return; }
    if (!regMobile.match(/^\d{10}$/)) { setError('Enter a valid 10-digit mobile number'); return; }
    
    setLoading(true); setError(''); setSuccessMsg('');
    try {
      await registerUser(regName.trim(), regMobile);
      // Automatically send OTP for direct login after registration
      setMobile(regMobile);
      const otpRes = await sendOtp(regMobile);
      setSessionId(otpRes.data.data.sessionId);
      setCountdown(60);
      setMode('login');
      setStep('otp');
      setSuccessMsg(`Registration successful! OTP sent to +91 ${regMobile}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <>
      <Head>
        <title>{mode === 'register' ? 'Register' : 'Login'} — Gunny Bags Manager</title>
        <meta name="description" content="Gunny Bags Manager portal" />
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
              width: 64, height: 64, borderRadius: 20, margin: '0 auto 14px',
              background: 'linear-gradient(135deg, #6366f1, #f59e0b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 20px 40px rgba(99,102,241,0.3)',
            }}>
              <Package2 size={30} color="white" />
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 26, color: 'var(--text-primary)' }}>
              Gunny Bags Manager
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
              Business Intelligence & Daily Ledger
            </p>
          </div>

          <div className="glass-card" style={{ padding: 30, boxShadow: '0 30px 60px rgba(0,0,0,0.4)', borderRadius: 18 }}>
            {/* Mode Switcher Tabs */}
            {step === 'mobile' && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                background: 'rgba(255,255,255,0.04)', borderRadius: 12,
                padding: 4, marginBottom: 24, border: '1px solid var(--border)',
              }}>
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(''); setNotRegistered(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '9px 12px', borderRadius: 9, border: 'none',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                    background: mode === 'login' ? 'var(--accent)' : 'transparent',
                    color: mode === 'login' ? '#fff' : 'var(--text-secondary)',
                    boxShadow: mode === 'login' ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                  }}
                >
                  <LogIn size={15} /> Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(''); setNotRegistered(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '9px 12px', borderRadius: 9, border: 'none',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                    background: mode === 'register' ? 'var(--accent)' : 'transparent',
                    color: mode === 'register' ? '#fff' : 'var(--text-secondary)',
                    boxShadow: mode === 'register' ? '0 4px 12px rgba(99,102,241,0.3)' : 'none',
                  }}
                >
                  <UserPlus size={15} /> Register
                </button>
              </div>
            )}

            {/* Success Message Banner */}
            {successMsg && (
              <div style={{
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
                borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                color: '#34d399', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <span>✓</span>
                <span>{successMsg}</span>
              </div>
            )}

            {/* LOGIN MODE: STEP 1 - MOBILE NUMBER */}
            {mode === 'login' && step === 'mobile' && (
              <form onSubmit={handleSendOtp}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Phone size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Mobile Number</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '10px 12px', fontSize: 14, color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                    }}>+91</div>
                    <input
                      type="tel" maxLength={10} placeholder="9876543210" value={mobile}
                      onChange={e => { setMobile(e.target.value.replace(/\D/g, '')); setError(''); setNotRegistered(false); }}
                      className="form-input" style={{ flex: 1 }} autoFocus
                    />
                  </div>
                </div>

                {/* Not Registered Notice with Quick Switch */}
                {notRegistered ? (
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 10, padding: '12px 14px', marginBottom: 16,
                  }}>
                    <p style={{ color: '#f87171', fontSize: 13, marginBottom: 8, fontWeight: 500 }}>
                      ⚠️ User not registered. Please register first.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('register');
                        setRegMobile(mobile);
                        setError('');
                        setNotRegistered(false);
                      }}
                      style={{
                        background: 'var(--accent)', color: '#fff', border: 'none',
                        borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}
                    >
                      Register Now with this Number <ArrowRight size={13} />
                    </button>
                  </div>
                ) : (
                  error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 16 }}>{error}</p>
                )}

                <button type="submit" className="btn-primary w-full" disabled={loading} style={{ width: '100%', padding: '13px', fontSize: 15 }}>
                  {loading ? 'Checking...' : 'Send OTP →'}
                </button>

                <div style={{ marginTop: 20, textAlign: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    New user?{' '}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setMode('register'); setError(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Create an account
                  </button>
                </div>
              </form>
            )}

            {/* REGISTER MODE: NAME & MOBILE (2 THINGS) */}
            {mode === 'register' && step === 'mobile' && (
              <form onSubmit={handleRegister}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <User size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Your Full Name</span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Patel"
                    value={regName}
                    onChange={e => { setRegName(e.target.value); setError(''); }}
                    className="form-input"
                    style={{ width: '100%' }}
                    autoFocus
                  />
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Phone size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Mobile Number</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '10px 12px', fontSize: 14, color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                    }}>+91</div>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="9876543210"
                      value={regMobile}
                      onChange={e => { setRegMobile(e.target.value.replace(/\D/g, '')); setError(''); }}
                      className="form-input"
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>

                {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 16 }}>{error}</p>}

                <button type="submit" className="btn-primary w-full" disabled={loading} style={{ width: '100%', padding: '13px', fontSize: 15 }}>
                  {loading ? 'Registering...' : 'Register & Send OTP →'}
                </button>

                <div style={{ marginTop: 20, textAlign: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    Already have an account?{' '}
                  </span>
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    Sign In
                  </button>
                </div>
              </form>
            )}

            {/* VERIFY OTP STEP (COMMON FOR BOTH) */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Shield size={18} style={{ color: '#10b981' }} />
                    <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>Verify OTP</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    OTP sent to +91 {mobile}. Default demo OTP is <code style={{ color: 'var(--accent)', fontWeight: 'bold' }}>123456</code>.
                  </p>
                  <input
                    type="text" maxLength={6} placeholder="123456" value={otp}
                    onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                    className="form-input" style={{ fontSize: 24, textAlign: 'center', letterSpacing: 8 }} autoFocus
                  />
                </div>

                {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 16 }}>{error}</p>}

                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '13px', fontSize: 15 }}>
                  {loading ? 'Verifying...' : 'Verify & Continue →'}
                </button>

                <div className="flex items-center justify-between mt-4">
                  <button type="button" onClick={() => { setStep('mobile'); setError(''); setOtp(''); setSuccessMsg(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>
                    ← Change number
                  </button>
                  <span style={{ fontSize: 13, color: countdown > 0 ? 'var(--text-secondary)' : 'var(--accent)', cursor: countdown > 0 ? 'default' : 'pointer' }}>
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
