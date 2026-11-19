import React, { useState } from 'react';
import {
  ArrowRight,
  Fingerprint,
  KeyRound,
  Lock,
  Shield,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import type { UserProfile, UserRole } from '../types';
import { api } from '../lib/api';
import { Avatar, BrandMark } from './SharedUI';

interface AuthScreensProps {
  onAuthenticated: (profile: UserProfile) => void;
  onToast: (msg: string, type?: 'success' | 'error') => void;
}

export function AuthScreens({ onAuthenticated, onToast }: AuthScreensProps) {
  const [portalRole, setPortalRole] = useState<UserRole>('customer');
  const [customerMode, setCustomerMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('elena.rostova@acmecorp.io');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('••••••••••••••');
  const [yubiVerified, setYubiVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  const switchPortal = (role: UserRole) => {
    setPortalRole(role);
    setYubiVerified(false);
    if (role === 'customer') {
      setEmail('elena.rostova@acmecorp.io');
    } else if (role === 'staff') {
      setEmail('sarah.lin@bizassist.internal');
    } else {
      setEmail('marcus.vance@bizassist.admin');
    }
  };

  const handleLogin = async (e?: React.FormEvent, overrideEmail?: string) => {
    if (e) e.preventDefault();
    const targetEmail = (overrideEmail || email).trim();
    if (!targetEmail) {
      onToast('Please enter a work email address.', 'error');
      return;
    }
    setLoading(true);
    try {
      const { profile } = await api.login(
        targetEmail,
        portalRole,
        customerMode === 'register' ? fullName : undefined
      );
      onAuthenticated(profile);
    } catch (err: any) {
      onToast(err.message || 'Sign in failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EBE9E1] text-[#1E1E24] flex flex-col">
      {/* Minimal Top Bar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-6">
        <BrandMark />
        <div className="flex items-center gap-2 bg-[#F7F6F2] p-1 rounded-xl border border-[#E4DFD7]">
          <button
            type="button"
            onClick={() => switchPortal('customer')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              portalRole === 'customer'
                ? 'bg-[#FFFFFF] text-[#1E1E24] shadow-sm'
                : 'text-[#686660] hover:text-[#1E1E24]'
            }`}
          >
            Customer Portal
          </button>
          <button
            type="button"
            onClick={() => switchPortal('staff')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              portalRole === 'staff'
                ? 'bg-[#FFFFFF] text-[#1E1E24] shadow-sm'
                : 'text-[#686660] hover:text-[#1E1E24]'
            }`}
          >
            Staff Workspace
          </button>
          <button
            type="button"
            onClick={() => switchPortal('admin')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
              portalRole === 'admin'
                ? 'bg-[#FFFFFF] text-[#1E1E24] shadow-sm'
                : 'text-[#686660] hover:text-[#1E1E24]'
            }`}
          >
            Admin Console
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-6 py-6 lg:py-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* Left Editorial Column (Desktop Context + Quick Persona Entry) */}
        <section className="lg:col-span-6 flex flex-col justify-between card-surface rounded-3xl p-8 bg-[#F7F6F2]">
          <div className="space-y-6">
            <p className="text-xs font-semibold tracking-wide text-[#E43D12]">
              Warm Kinetic Intelligence · Multi-Tenant Support
            </p>
            <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight text-[#1E1E24] text-balance leading-tight">
              Immediate clarity for customers, calibrated triage for specialists.
            </h1>
            <p className="text-sm lg:text-base text-[#686660] leading-relaxed max-w-lg">
              Synchronized incident response across Customer Portal, Tier-2 Infrastructure
              Specialists, and Sec-Ops Operations Command—backed by Supabase PostgreSQL and
              Gemini diagnostic intelligence.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-[#E4DFD7] space-y-4">
            <p className="text-xs font-semibold text-[#686660]">
              Instant Role Switcher & Workspace Access
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleLogin(undefined, 'elena.rostova@acmecorp.io')}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#E4DFD7] hover:border-[#E43D12] transition-colors text-left"
              >
                <Avatar
                  src="/src/assets/images/avatar_elena_1795079072007.jpg"
                  name="Elena Rostova"
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#1E1E24] truncate">Elena R.</div>
                  <div className="text-[11px] text-[#686660] truncate">Customer</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleLogin(undefined, 'sarah.lin@bizassist.internal')}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#E4DFD7] hover:border-[#E43D12] transition-colors text-left"
              >
                <Avatar
                  src="/src/assets/images/avatar_sarah_1795079071848.jpg"
                  name="Sarah Lin"
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#1E1E24] truncate">Sarah Lin</div>
                  <div className="text-[11px] text-[#686660] truncate">Staff SRE</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleLogin(undefined, 'marcus.vance@bizassist.admin')}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white border border-[#E4DFD7] hover:border-[#E43D12] transition-colors text-left"
              >
                <Avatar
                  src="/src/assets/images/avatar_marcus_1795079072045.jpg"
                  name="Marcus Vance"
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#1E1E24] truncate">Marcus V.</div>
                  <div className="text-[11px] text-[#686660] truncate">Admin Ops</div>
                </div>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-[#686660] pt-1">
              <span>SOC-2 Type II</span>
              <span aria-hidden="true">·</span>
              <span>256-bit Encryption</span>
              <span aria-hidden="true">·</span>
              <span>Acme Tenant Isolation</span>
            </div>
          </div>
        </section>

        {/* Right Auth Card matching the 3 Stitch Login Screens */}
        <section className="lg:col-span-6 card-surface rounded-3xl p-6 sm:p-8 flex flex-col justify-between">
          {portalRole === 'customer' && (
            <form onSubmit={(e) => handleLogin(e)} className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#D6536D]">
                  Enterprise Customer Portal
                </p>
                <h2 className="font-display text-2xl font-bold text-[#1E1E24]">
                  {customerMode === 'signin' ? 'Sign in to BizAssist' : 'Create Tenant Account'}
                </h2>
                <p className="text-sm text-[#686660]">
                  Warm, kinetic business intelligence at your fingertips.
                </p>
              </div>

              <div className="grid grid-cols-2 p-1 bg-[#F7F6F2] rounded-xl border border-[#E4DFD7]">
                <button
                  type="button"
                  onClick={() => setCustomerMode('signin')}
                  className={`py-2.5 text-xs font-semibold rounded-lg transition-colors ${
                    customerMode === 'signin'
                      ? 'bg-white text-[#1E1E24] shadow-sm'
                      : 'text-[#686660]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode('register')}
                  className={`py-2.5 text-xs font-semibold rounded-lg transition-colors ${
                    customerMode === 'register'
                      ? 'bg-white text-[#1E1E24] shadow-sm'
                      : 'text-[#686660]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <div className="space-y-4">
                {customerMode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-[#1E1E24] mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Elena Rostova"
                      className="w-full h-12 px-4 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-sm focus:outline-none focus:border-[#E43D12]"
                    />
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#1E1E24]">Work Email</label>
                    <span className="text-xs text-[#D6536D] font-medium">Verified Domain</span>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-sm focus:outline-none focus:border-[#E43D12]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#1E1E24]">Password</label>
                    <button
                      type="button"
                      onClick={() => onToast('Password reset link dispatched to your work email.')}
                      className="text-xs text-[#E43D12] font-medium hover:underline"
                    >
                      Forgot Password?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-sm focus:outline-none focus:border-[#E43D12]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-13 rounded-full bg-[#E43D12] hover:bg-[#c8340e] text-white font-display font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FFA2B6]/25 text-[#D6536D] flex items-center justify-center">
                    <Fingerprint className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#1E1E24]">Fast Pass Active</div>
                    <div className="text-xs text-[#686660]">Touch ID or Face ID</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleLogin()}
                  className="px-4 py-2 rounded-xl bg-white border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24] hover:border-[#1E1E24] transition-colors"
                >
                  Authenticate
                </button>
              </div>

              <div className="space-y-2.5">
                <div className="text-center text-[11px] font-semibold tracking-wide text-[#686660]">
                  Or Single Sign-On (SSO)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleLogin(undefined, 'elena.rostova@acmecorp.io')}
                    className="h-11 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24] hover:bg-white transition-colors"
                  >
                    Okta Verify
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLogin(undefined, 'david.chen@cloudscale.io')}
                    className="h-11 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24] hover:bg-white transition-colors"
                  >
                    Google Suite
                  </button>
                </div>
              </div>
            </form>
          )}

          {portalRole === 'staff' && (
            <form onSubmit={(e) => handleLogin(e)} className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#D6536D]">
                  Kernel Ops · Staff Specialist Portal
                </p>
                <h2 className="font-display text-2xl font-bold text-[#1E1E24]">
                  Specialist Workspace
                </h2>
                <p className="text-sm text-[#686660]">
                  Secure triage dispatch & Tier-2 incident response.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleLogin(undefined, 'sarah.lin@bizassist.internal')}
                  className="h-11 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24] hover:bg-white"
                >
                  Okta SSO
                </button>
                <button
                  type="button"
                  onClick={() => handleLogin(undefined, 'marcus.kane@bizassist.internal')}
                  className="h-11 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24] hover:bg-white"
                >
                  GCloud Identity
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#1E1E24]">Work Email</label>
                    <span className="text-xs text-[#D6536D] font-medium">
                      Tier-2 Infra Specialist
                    </span>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-sm focus:outline-none focus:border-[#E43D12]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#1E1E24]">
                      Security Token / PIN
                    </label>
                    <span className="text-xs text-[#686660]">OTP / YubiKey Active</span>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-sm focus:outline-none focus:border-[#E43D12]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setYubiVerified(true)}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center justify-between transition-colors ${
                    yubiVerified
                      ? 'bg-emerald-50 border-emerald-300'
                      : 'bg-[#FFA2B6]/15 border-[#D6536D]/30 hover:border-[#D6536D]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <KeyRound className="w-5 h-5 text-[#D6536D]" />
                    <div>
                      <div className="text-xs font-bold text-[#1E1E24]">
                        YubiKey 5C NFC {yubiVerified ? 'Verified' : 'Detected'}
                      </div>
                      <div className="text-xs text-[#686660]">
                        {yubiVerified
                          ? 'Hardware handshake confirmed'
                          : 'Touch token to authenticate'}
                      </div>
                    </div>
                  </div>
                  <UserCheck className="w-4 h-4 text-[#D6536D]" />
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-13 rounded-full bg-[#E43D12] hover:bg-[#c8340e] text-white font-display font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>{loading ? 'Verifying...' : 'Verify & Enter Workspace'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {portalRole === 'admin' && (
            <form onSubmit={(e) => handleLogin(e)} className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#D6536D]">
                  Sec-Ops Tier 1 · Intelligence Mesh
                </p>
                <h2 className="font-display text-2xl font-bold text-[#1E1E24]">
                  System Administration
                </h2>
                <p className="text-sm text-[#686660]">
                  Global infrastructure, tenant governance & dispatch gateway.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F7F6F2] border border-[#E4DFD7] flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold text-[#686660]">Active Partition</div>
                  <div className="text-xs font-bold text-[#1E1E24]">
                    Acme Global Cluster (us-east)
                  </div>
                </div>
                <span className="text-xs font-semibold text-[#E43D12]">PROD</span>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#1E1E24]">Admin Work ID</label>
                    <span className="text-xs text-[#686660]">FIDO2 Ready</span>
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-sm focus:outline-none focus:border-[#E43D12]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#1E1E24]">
                      Master Token PIN / Passkey
                    </label>
                    <span className="text-xs text-[#E43D12] font-medium">6 Digits Req.</span>
                  </div>
                  <input
                    type="password"
                    value="849201"
                    readOnly
                    className="w-full h-12 px-4 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-sm font-mono"
                  />
                </div>

                <div className="p-4 rounded-2xl bg-[#FFA2B6]/15 border border-[#D6536D]/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ShieldAlert className="w-5 h-5 text-[#D6536D] shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-[#1E1E24]">
                        YubiKey 5Ci Bio Detected
                      </div>
                      <div className="text-xs text-[#686660]">
                        Hardware cryptographic handshake ready
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setYubiVerified(true)}
                    className="px-3.5 py-2 rounded-xl bg-[#D6536D] text-white text-xs font-semibold whitespace-nowrap"
                  >
                    {yubiVerified ? 'Confirmed' : 'Touch key'}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-13 rounded-full bg-[#E43D12] hover:bg-[#c8340e] text-white font-display font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>{loading ? 'Authorizing...' : 'Authorize Admin Console'}</span>
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleLogin()}
                  className="h-11 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24]"
                >
                  Okta Privileged
                </button>
                <button
                  type="button"
                  onClick={() => handleLogin()}
                  className="h-11 rounded-xl bg-[#F7F6F2] border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24]"
                >
                  Duo Enterprise
                </button>
              </div>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
