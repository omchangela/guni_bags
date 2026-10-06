import Head from 'next/head';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { sendOtp, verifyOtp } from '@/lib/api';
import { Package2, Phone, Shield } from 'lucide-react';

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
      setError(err.response?.data?.message || 'Failed to send OTP');
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
        <title>Login — Gunny Bags Manager</title>
        <meta name="description" content="Login to Gunny Bags Manager dashboard" />
      </Head>
      <div style={{
        minHeight: '100vh', background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
        backgroundImage: 'radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.08) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(245,158,11,0.06) 0%, transparent 60%)',
      }}>
        <div style={{ width: '100%', maxWidth: 440 }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 36 }}>
            <div style={{
              width: 68, height: 68, borderRadius: 20, margin: '0 auto 16px',
              background: 'linear-gradient(135deg, #6366f1, #f59e0b)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 20px 40px rgba(99,102,241,0.3)',
            }}>
              <Package2 size={32} color="white" />
            </div>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 800, fontSize: 28, color: 'var(--text-primary)' }}>
              Gunny Bags Manager
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              Business Intelligence Dashboard
            </p>
          </div>

          <div className="glass-card" style={{ padding: 32, boxShadow: '0 30px 60px rgba(0,0,0,0.4)' }}>
            {step === 'mobile' ? (
              <form onSubmit={handleSendOtp}>
                <div style={{ marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <Phone size={18} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Mobile Number</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '10px 12px', fontSize: 14, color: 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                    }}>+91</div>
                    <input
                      type="tel" maxLength={10} placeholder="9876543210" value={mobile}
                      onChange={e => { setMobile(e.target.value.replace(/\D/g, '')); setError(''); }}
                      className="form-input" style={{ flex: 1 }} autoFocus
                    />
                  </div>
                </div>
                {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 16 }}>{error}</p>}
                <button type="submit" className="btn-primary w-full" disabled={loading} style={{ width: '100%', padding: '13px', fontSize: 15 }}>
                  {loading ? 'Sending OTP...' : 'Send OTP →'}
                </button>
                <div style={{ marginTop: 20, padding: 12, background: 'rgba(99,102,241,0.08)', borderRadius: 10, border: '1px solid rgba(99,102,241,0.2)' }}>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center' }}>
                    🔧 Dev Mode — OTP will be logged in backend console
                  </p>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <Shield size={18} style={{ color: '#10b981' }} />
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Enter OTP</span>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    OTP sent to +91 {mobile}. In dev mode, check backend console.
                  </p>
                  <input
                    type="text" maxLength={6} placeholder="123456" value={otp}
                    onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setError(''); }}
                    className="form-input" style={{ fontSize: 22, textAlign: 'center', letterSpacing: 8 }} autoFocus
                  />
                </div>
                {error && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 16 }}>{error}</p>}
                <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', padding: '13px', fontSize: 15 }}>
                  {loading ? 'Verifying...' : 'Verify & Login →'}
                </button>
                <div className="flex items-center justify-between mt-4">
                  <button type="button" onClick={() => { setStep('mobile'); setError(''); setOtp(''); }}
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
