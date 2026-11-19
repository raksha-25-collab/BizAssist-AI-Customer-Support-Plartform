import React, { useCallback, useEffect, useState } from 'react';
import {
  BarChart3,
  Bell,
  Bot,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  PlusCircle,
  Settings,
  Ticket as TicketIcon,
  UserCircle2,
  UserPlus,
} from 'lucide-react';
import type {
  AppNotification,
  HealthStatus,
  Runbook,
  Ticket,
  UserProfile,
  UserRole,
} from './types';
import { api } from './lib/api';
import { getSupabaseBrowserClient } from './lib/supabase';
import { Avatar, BrandMark, ToastBanner } from './components/SharedUI';
import { AuthScreens } from './components/AuthScreens';
import { CustomerViews, type CustomerScreen } from './components/CustomerViews';
import { StaffViews, type StaffScreen } from './components/StaffViews';
import { AdminViews, type AdminScreen } from './components/AdminViews';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [customerScreen, setCustomerScreen] = useState<CustomerScreen>('portal');
  const [staffScreen, setStaffScreen] = useState<StaffScreen>('dashboard');
  const [adminScreen, setAdminScreen] = useState<AdminScreen>('dashboard');

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [runbooks, setRunbooks] = useState<Runbook[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('tkt-8902');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 3500);
  }, []);

  const refreshData = useCallback(async (roleOverride?: UserRole) => {
    const activeRole = roleOverride || user?.role || 'customer';
    try {
      const [tRes, pRes, nRes, rRes, hRes] = await Promise.all([
        api.getTickets(),
        api.getProfiles(),
        api.getNotifications(activeRole),
        api.getRunbooks(),
        api.getHealth(),
      ]);
      setTickets(tRes.tickets);
      setProfiles(pRes.profiles);
      setNotifications(nRes.notifications);
      setRunbooks(rRes.runbooks);
      setHealth(hRes);
    } catch {
      // Keep UI responsive on transient fetch errors
    }
  }, [user?.role]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Subscribe to Supabase Realtime if client keys are configured, with light background sync
  useEffect(() => {
    if (!user) return;
    const sb = getSupabaseBrowserClient();
    if (sb) {
      const channel = sb
        .channel('bizassist-live')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
          refreshData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_messages' }, () => {
          refreshData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
          refreshData();
        })
        .subscribe();

      return () => {
        sb.removeChannel(channel);
      };
    }

    const interval = setInterval(() => {
      refreshData();
    }, 15000);
    return () => clearInterval(interval);
  }, [user, refreshData]);

  const handleAuthenticated = async (profile: UserProfile) => {
    setUser(profile);
    if (profile.role === 'customer') setCustomerScreen('portal');
    if (profile.role === 'staff') setStaffScreen('dashboard');
    if (profile.role === 'admin') setAdminScreen('dashboard');
    await refreshData(profile.role);
    showToast(`Signed in as ${profile.full_name} (${profile.role}).`);
  };

  const handleSwitchPersona = async (role: UserRole) => {
    const targetEmail =
      role === 'customer'
        ? 'elena.rostova@acmecorp.io'
        : role === 'staff'
          ? 'sarah.lin@bizassist.internal'
          : 'marcus.vance@bizassist.admin';
    const existing = profiles.find((p) => p.email === targetEmail);
    if (existing) {
      await handleAuthenticated(existing);
    } else {
      const { profile } = await api.login(targetEmail, role);
      await handleAuthenticated(profile);
    }
  };

  if (!user) {
    return (
      <>
        <AuthScreens onAuthenticated={handleAuthenticated} onToast={showToast} />
        <ToastBanner
          message={toast?.message || null}
          type={toast?.type}
          onClose={() => setToast(null)}
        />
      </>
    );
  }

  const unreadNotifs = notifications.filter((n) => !n.is_read).length;

  type NavItem = {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  };

  const customerNav: NavItem[] = [
    { id: 'portal', label: 'Portal', icon: LayoutDashboard },
    { id: 'submit', label: 'Submit', icon: PlusCircle },
    { id: 'tickets', label: 'Tickets', icon: TicketIcon },
    { id: 'assistant', label: 'AI Help', icon: Bot },
    { id: 'notifications', label: 'Alerts', icon: Bell, badge: unreadNotifs },
  ];

  const staffNav: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'queue', label: 'Tickets', icon: ClipboardList },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'profile', label: 'Profile', icon: UserCircle2, badge: unreadNotifs },
  ];

  const adminNav: NavItem[] = [
    { id: 'dashboard', label: 'Dash', icon: LayoutDashboard },
    { id: 'tickets', label: 'Tickets', icon: TicketIcon },
    { id: 'assign', label: 'Assign', icon: UserPlus },
    { id: 'analytics', label: 'Metrics', icon: BarChart3 },
    { id: 'config', label: 'Config', icon: Settings },
  ];

  const activeNav =
    user.role === 'customer' ? customerNav : user.role === 'staff' ? staffNav : adminNav;
  const activeScreenId =
    user.role === 'customer'
      ? customerScreen
      : user.role === 'staff'
        ? staffScreen
        : adminScreen;

  const setActiveScreenId = (id: string) => {
    if (user.role === 'customer') setCustomerScreen(id as CustomerScreen);
    else if (user.role === 'staff') setStaffScreen(id as StaffScreen);
    else setAdminScreen(id as AdminScreen);
  };

  return (
    <div className="min-h-screen bg-[#EBE9E1] text-[#1E1E24] flex flex-col lg:flex-row">
      {/* Desktop Left Workspace Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:shrink-0 bg-[#F7F6F2] border-r border-[#E4DFD7] p-5 justify-between sticky top-0 h-screen">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <BrandMark />
          </div>

          {/* Role Switcher */}
          <div className="p-1 bg-[#EBE9E1] rounded-xl grid grid-cols-3 gap-1">
            {(['customer', 'staff', 'admin'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleSwitchPersona(r)}
                className={`py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-colors ${
                  user.role === r ? 'bg-white text-[#1E1E24] shadow-sm' : 'text-[#686660]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <nav className="space-y-1.5">
            {activeNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeScreenId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveScreenId(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-[#E43D12] text-white'
                      : 'text-[#1E1E24] hover:bg-white'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </span>
                  {item.badge ? (
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full tabular-nums ${
                        isActive ? 'bg-white text-[#E43D12]' : 'bg-[#E43D12] text-white'
                      }`}
                    >
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>

        {/* User Footer */}
        <div className="pt-4 border-t border-[#E4DFD7] space-y-3">
          <div className="flex items-center gap-3">
            <Avatar src={user.avatar_url} name={user.full_name} size="sm" online />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-[#1E1E24] truncate">{user.full_name}</div>
              <div className="text-[11px] text-[#686660] truncate">{user.title}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setUser(null)}
            className="w-full h-9 rounded-xl bg-white border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24] hover:border-[#E43D12] flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            Switch / Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Compact Sticky Top Header (52px) */}
      <header className="lg:hidden sticky top-0 z-30 h-13 px-4 bg-[#EBE9E1]/90 backdrop-blur-md border-b border-[#E4DFD7] flex items-center justify-between">
        <BrandMark />
        <div className="flex items-center gap-2">
          <select
            aria-label="Switch workspace role"
            value={user.role}
            onChange={(e) => handleSwitchPersona(e.target.value as UserRole)}
            className="h-8 px-2.5 rounded-lg bg-white border border-[#E4DFD7] text-xs font-semibold text-[#1E1E24]"
          >
            <option value="customer">Customer</option>
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          <button
            type="button"
            onClick={() => setUser(null)}
            aria-label="Sign out"
            className="w-8 h-8 rounded-full bg-white border border-[#E4DFD7] flex items-center justify-center"
          >
            <LogOut className="w-3.5 h-3.5 text-[#1E1E24]" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-10 py-6 pb-24 lg:pb-10">
        <div className="max-w-6xl mx-auto">
          {user.role === 'customer' && (
            <CustomerViews
              screen={customerScreen}
              setScreen={setCustomerScreen}
              user={user}
              tickets={tickets}
              selectedTicketId={selectedTicketId}
              setSelectedTicketId={setSelectedTicketId}
              notifications={notifications}
              onRefresh={() => refreshData('customer')}
              onToast={showToast}
            />
          )}

          {user.role === 'staff' && (
            <StaffViews
              screen={staffScreen}
              setScreen={setStaffScreen}
              user={user}
              tickets={tickets}
              selectedTicketId={selectedTicketId}
              setSelectedTicketId={setSelectedTicketId}
              notifications={notifications}
              runbooks={runbooks}
              onRefresh={() => refreshData('staff')}
              onToast={showToast}
            />
          )}

          {user.role === 'admin' && (
            <AdminViews
              screen={adminScreen}
              setScreen={setAdminScreen}
              user={user}
              tickets={tickets}
              profiles={profiles}
              selectedTicketId={selectedTicketId}
              setSelectedTicketId={setSelectedTicketId}
              health={health}
              onRefresh={() => refreshData('admin')}
              onToast={showToast}
            />
          )}
        </div>
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (56px-64px, well within 15% sticky cap) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 backdrop-blur-md border-t border-[#E4DFD7] px-2 flex items-center justify-around">
        {activeNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreenId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveScreenId(item.id)}
              className={`relative flex flex-col items-center justify-center min-w-[44px] min-h-[44px] px-2 transition-colors ${
                isActive ? 'text-[#E43D12]' : 'text-[#686660]'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold mt-0.5 whitespace-nowrap">
                {item.label}
              </span>
              {item.badge ? (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#E43D12]" />
              ) : null}
            </button>
          );
        })}
      </nav>

      <ToastBanner
        message={toast?.message || null}
        type={toast?.type}
        onClose={() => setToast(null)}
      />
    </div>
  );
}
