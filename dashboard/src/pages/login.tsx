import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { sendOtp, verifyOtp } from '@/lib/api';
import { Package2, Phone, Shield, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'mobile' | 'otp'>('mobile');
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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mobile.match(/^\d{10}$/)) { setError('Enter a valid 10-digit mobile number'); return; }
    setLoading(true); setError('');
    try {
      const res = await sendOtp(mobile);
      setSessionId(res.data.data.sessionId);
      setCountdown(60);
      setStep('otp');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to send OTP';
      setError(msg);
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

  return (
    <>
      <Head>
        <title>Admin Login — Gunny Bags Manager</title>
        <meta name="description" content="Restricted admin access — Gunny Bags Manager" />
      </Head>
      <div style={{
        minHeight: '100vh', background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(245,158,11,0.06) 0%, transparent 60%)',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
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
              Business Intelligence Dashboard
            </p>

            {/* Restricted access badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 20, padding: '4px 12px',
            }}>
              <Lock size={11} style={{ color: '#f87171' }} />
              <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600, letterSpacing: 0.5 }}>
                RESTRICTED ACCESS
              </span>
            </div>
          </div>

          <div className="glass-card" style={{ padding: 32, boxShadow: '0 30px 60px rgba(0,0,0,0.4)', borderRadius: 18 }}>

            {/* STEP 1 — Mobile */}
            {step === 'mobile' && (
              <form onSubmit={handleSendOtp}>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Phone size={16} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Admin Mobile Number</span>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '11px 14px', fontSize: 14, color: 'var(--text-secondary)',
                    whiteSpace: 'nowrap',
                  }}>+91</div>
                  <input
                    id="admin-mobile"
                    type="tel"
                    maxLength={10}
                    placeholder="Enter admin mobile"
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
                  id="send-otp-btn"
                  className="btn-primary"
                  disabled={loading}
                  style={{ width: '100%', padding: '13px', fontSize: 15, marginTop: error ? 0 : 14 }}
                >
                  {loading ? 'Verifying access...' : 'Send OTP →'}
                </button>
              </form>
            )}

            {/* STEP 2 — OTP */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Shield size={18} style={{ color: '#10b981' }} />
                  <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-primary)' }}>Enter OTP</span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                  OTP sent to <strong style={{ color: 'var(--text-primary)' }}>+91 {mobile}</strong>
                </p>
                <input
                  id="otp-input"
                  type="text"
                  maxLength={6}
                  placeholder="______"
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
                  {loading ? 'Verifying...' : 'Verify & Login →'}
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
                  <button
                    type="button"
                    onClick={() => { setStep('mobile'); setError(''); setOtp(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', padding: 0 }}
                  >
                    ← Change number
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

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-secondary)', opacity: 0.6 }}>
            Unauthorized access is prohibited.
          </p>
        </div>
      </div>
    </>
  );
}
