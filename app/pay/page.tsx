"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePrivy, useLogin } from '@privy-io/react-auth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface PaymentLink {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  url: string;
  amount: string | null;
  currency: string;
  active: boolean;
  redirectUrl: string | null;
  successMessage: string | null;
  imageUrl: string | null;
  network: string;
  createdAt: string;
  updatedAt: string;
}

const NETWORKS = [
  { name: 'Base', logo: '/base-logo.svg' },
  { name: 'Polygon', logo: '/polygon-logo.svg' },
  { name: 'Celo', logo: '/celo-logo.svg' },
  { name: 'Lisk', logo: '/lisk-white-logo.png' },
  { name: 'Ethereum', logo: '/ethereum-logo.svg' },
];

const TOKENS = [
  { name: 'USDC', logo: '/usdc.svg' },
  { name: 'USDT', logo: '/usdt.svg' },
];

function AppSidebar({
  authenticated,
  ready,
  privyUser,
  login,
  logout,
  links
}: {
  authenticated: boolean;
  ready: boolean;
  privyUser: ReturnType<typeof usePrivy>['user'];
  login: () => void;
  logout: () => void;
  links: PaymentLink[];
}) {
  // Display tokens in sidebar
  const activeTokens = TOKENS.length;
  const activeLinks = links.filter(l => l.active).length;

  return (
    <Sidebar className="border-r border-neutral-800 bg-[#111111]">
      <SidebarHeader className="p-5 border-b border-neutral-800">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center">
            <Image src="/minisend-white.png" alt="Minisend" width={32} height={32} className="invert" />
          </div>
          <span className="font-bold text-[20px] text-white">Minisend</span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="px-3 py-5">
        <SidebarGroup>
          <SidebarGroupLabel className="text-neutral-400 text-[12px] uppercase tracking-wider px-3 font-semibold mb-3">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton isActive className="text-white text-[16px] h-12 bg-[#8b53ff] hover:bg-[#7a45e6]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>Payment Links</span>
                  {activeLinks > 0 && (
                    <span className="ml-auto text-[12px] bg-white/20 px-2 py-0.5">{activeLinks}</span>
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/" className="text-neutral-300 hover:text-white text-[16px] h-12 hover:bg-neutral-800">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="#" className="text-neutral-300 hover:text-white text-[16px] h-12 hover:bg-neutral-800">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>Analytics</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-neutral-800 my-5" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-neutral-400 text-[12px] uppercase tracking-wider px-3 font-semibold mb-3">
            Networks
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-3">
            <div className="flex items-center gap-3 py-2">
              {NETWORKS.map((network) => (
                <div
                  key={network.name}
                  className="w-8 h-8 relative cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                  title={network.name}
                >
                  <Image src={network.logo} alt={network.name} fill className="object-contain" />
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="bg-neutral-800 my-5" />

        <SidebarGroup>
          <SidebarGroupLabel className="text-neutral-400 text-[12px] uppercase tracking-wider px-3 font-semibold mb-3">
            Tokens ({activeTokens})
          </SidebarGroupLabel>
          <SidebarGroupContent className="px-3">
            <div className="flex items-center gap-3 py-2">
              {TOKENS.map((token) => (
                <div
                  key={token.name}
                  className="w-8 h-8 relative cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
                  title={token.name}
                >
                  <Image src={token.logo} alt={token.name} fill className="object-contain" />
                </div>
              ))}
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-neutral-800">
        {ready && (
          authenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full p-3 hover:bg-neutral-800 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-[#8b53ff] text-white text-[14px] font-bold">
                      {privyUser?.email?.address?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-[15px] font-medium text-white truncate">
                      {privyUser?.email?.address || 'User'}
                    </p>
                    <p className="text-[13px] text-neutral-500">Account</p>
                  </div>
                  <svg className="w-4 h-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#1a1a1a] border-neutral-700">
                <DropdownMenuItem className="text-neutral-300 focus:text-white focus:bg-neutral-800 text-[14px]">
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-neutral-700" />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-red-400 focus:text-red-300 focus:bg-red-500/10 text-[14px]"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => login()}
              className="w-full bg-[#8b53ff] hover:bg-[#7a45e6] text-white font-semibold h-12 text-[15px] rounded-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign In
            </Button>
          )
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

export default function PayPage() {
  const [links, setLinks] = useState<PaymentLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { authenticated, ready, user: privyUser, logout } = usePrivy();
  const { login } = useLogin({
    onComplete: () => {},
    onError: (err) => console.error('Login error:', err),
  });

  const [form, setForm] = useState({
    name: '',
    description: '',
    slug: '',
    amount: '',
    redirectUrl: '',
    successMessage: '',
    paymentLimit: '',
  });

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch('/api/blockradar/payment-links');
      const data = await res.json();
      if (data.links) setLinks(data.links);
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const resetForm = () => {
    setForm({ name: '', description: '', slug: '', amount: '', redirectUrl: '', successMessage: '', paymentLimit: '' });
    setError(null);
  };

  const createLink = async () => {
    if (!form.name.trim()) {
      setError('Name is required');
      return;
    }
    setCreating(true);
    setError(null);

    try {
      const payload: Record<string, string | number> = { name: form.name.trim() };
      if (form.description.trim()) payload.description = form.description.trim();
      if (form.slug.trim()) payload.slug = form.slug.trim().toLowerCase().replace(/\s+/g, '-');
      if (form.amount.trim()) payload.amount = form.amount.trim();
      if (form.redirectUrl.trim()) payload.redirectUrl = form.redirectUrl.trim();
      if (form.successMessage.trim()) payload.successMessage = form.successMessage.trim();
      if (form.paymentLimit.trim()) payload.paymentLimit = parseInt(form.paymentLimit.trim());

      const res = await fetch('/api/blockradar/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create');

      setLinks([data, ...links]);
      resetForm();
      setShowCreateForm(false);
      setSuccess('Payment link created successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (url: string, id: string) => {
    await navigator.clipboard.writeText(url);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const shareLink = async (link: PaymentLink) => {
    if (navigator.share) {
      try {
        await navigator.share({ title: link.name, text: link.description || '', url: link.url });
      } catch {
        copyLink(link.url, link.id);
      }
    } else {
      copyLink(link.url, link.id);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const totalRevenue = links.reduce((acc, link) => {
    if (link.amount) return acc + parseFloat(link.amount);
    return acc;
  }, 0);

  return (
    <SidebarProvider>
      <AppSidebar
        authenticated={authenticated}
        ready={ready}
        privyUser={privyUser}
        login={login}
        logout={logout}
        links={links}
      />
      <SidebarInset className="bg-[#0a0a0a]">
        {/* Modal Backdrop */}
        {showCreateForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setShowCreateForm(false)}>
            <div className="w-full max-w-xl bg-[#141414] border border-neutral-700 rounded-xl" onClick={(e) => e.stopPropagation()}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-[22px] font-bold text-white">Create Payment Link</h2>
                    <p className="text-[14px] text-neutral-400 mt-1">Generate a new payment link for your customers</p>
                  </div>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="p-2 hover:bg-neutral-800 rounded-lg"
                  >
                    <svg className="w-5 h-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-[14px] px-4 py-3 mb-5 flex items-start gap-3 rounded-lg">
                    <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-[14px] text-neutral-300 mb-2 block font-medium">Link Name *</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g. Premium Subscription"
                      className="w-full bg-[#0a0a0a] border border-neutral-700 text-white text-[15px] px-4 py-3 outline-none focus:border-[#8b53ff] placeholder:text-neutral-500 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[14px] text-neutral-300 mb-2 block font-medium">Amount (USD)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-[15px]">$</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={form.amount}
                          onChange={(e) => setForm({ ...form, amount: e.target.value })}
                          placeholder="0.00"
                          className="w-full bg-[#0a0a0a] border border-neutral-700 text-white text-[15px] pl-8 pr-4 py-3 outline-none focus:border-[#8b53ff] placeholder:text-neutral-500 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[14px] text-neutral-300 mb-2 block font-medium">Custom Slug</label>
                      <input
                        type="text"
                        value={form.slug}
                        onChange={(e) => setForm({ ...form, slug: e.target.value })}
                        placeholder="my-product"
                        className="w-full bg-[#0a0a0a] border border-neutral-700 text-white text-[15px] px-4 py-3 outline-none focus:border-[#8b53ff] placeholder:text-neutral-500 font-mono rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[14px] text-neutral-300 mb-2 block font-medium">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="What's this payment for?"
                      rows={3}
                      className="w-full bg-[#0a0a0a] border border-neutral-700 text-white text-[15px] px-4 py-3 outline-none focus:border-[#8b53ff] placeholder:text-neutral-500 resize-none rounded-lg"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => {
                        setShowCreateForm(false);
                        resetForm();
                      }}
                      variant="outline"
                      className="flex-1 bg-transparent border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white text-[15px] h-12 rounded-lg"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={createLink}
                      disabled={creating || !form.name.trim()}
                      className="flex-1 bg-[#8b53ff] hover:bg-[#7a45e6] disabled:bg-neutral-800 disabled:text-neutral-500 text-[15px] h-12 font-semibold rounded-lg"
                    >
                      {creating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                          Create Link
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {success && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-2">
            <div className="bg-emerald-600 text-white px-5 py-3 text-[14px] font-medium flex items-center gap-2 rounded-lg">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="h-full overflow-auto">
          {/* Header */}
          <header className="sticky top-0 z-40 border-b border-neutral-800 bg-[#0a0a0a]">
            <div className="flex items-center justify-between h-[72px] px-8">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="text-neutral-400 hover:text-white hover:bg-neutral-800 -ml-2" />
                <div>
                  <h1 className="text-[22px] font-bold text-white">Payment Links</h1>
                  <p className="text-[14px] text-neutral-500">Manage your payment infrastructure</p>
                </div>
              </div>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-[#8b53ff] hover:bg-[#7a45e6] text-white text-[15px] h-11 px-6 font-semibold rounded-lg"
              >
                <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Link
              </Button>
            </div>
          </header>

          <div className="p-8 max-w-[1400px] mx-auto">
            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              {/* Total Revenue */}
              <div className="bg-[#141414] border border-neutral-800 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[13px] text-neutral-400 font-medium uppercase tracking-wide">Total Revenue</span>
                  <svg className="w-6 h-6 text-[#8b53ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-[32px] font-bold text-white">${totalRevenue.toFixed(2)}</div>
                <p className="text-[14px] text-neutral-500 mt-2">From all payment links</p>
              </div>

              {/* Total Links */}
              <div className="bg-[#141414] border border-neutral-800 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[13px] text-neutral-400 font-medium uppercase tracking-wide">Total Links</span>
                  <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <div className="text-[32px] font-bold text-white">{links.length}</div>
                <p className="text-[14px] text-neutral-500 mt-2">{links.filter(l => l.active).length} active</p>
              </div>

              {/* Success Rate */}
              <div className="bg-[#141414] border border-neutral-800 p-6 rounded-xl">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[13px] text-neutral-400 font-medium uppercase tracking-wide">Success Rate</span>
                  <svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-[32px] font-bold text-white">{links.length > 0 ? Math.round((links.filter(l => l.active).length / links.length) * 100) : 0}%</div>
                <p className="text-[14px] text-neutral-500 mt-2">Links are active</p>
              </div>
            </div>

            {/* Payment Links List */}
            <div className="bg-[#141414] border border-neutral-800 rounded-xl overflow-hidden">
              {/* List Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-800">
                <h2 className="text-[18px] font-semibold text-white">Your Links</h2>
                <div className="flex items-center gap-3">
                  <span className="text-[14px] text-neutral-400">{links.length} total</span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="flex items-center gap-2 text-[14px] text-neutral-300 hover:text-white px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                        </svg>
                        Filter
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 bg-[#1a1a1a] border-neutral-700">
                      <DropdownMenuItem className="text-neutral-300 focus:text-white focus:bg-neutral-800 text-[14px]">All Links</DropdownMenuItem>
                      <DropdownMenuItem className="text-neutral-300 focus:text-white focus:bg-neutral-800 text-[14px]">Active Only</DropdownMenuItem>
                      <DropdownMenuItem className="text-neutral-300 focus:text-white focus:bg-neutral-800 text-[14px]">Inactive Only</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-[2fr_150px_120px_140px_180px] gap-6 px-6 py-4 border-b border-neutral-800 bg-[#0f0f0f]">
                <span className="text-[13px] text-neutral-400 font-medium uppercase tracking-wide">Name</span>
                <span className="text-[13px] text-neutral-400 font-medium uppercase tracking-wide">Amount</span>
                <span className="text-[13px] text-neutral-400 font-medium uppercase tracking-wide">Status</span>
                <span className="text-[13px] text-neutral-400 font-medium uppercase tracking-wide">Created</span>
                <span className="text-[13px] text-neutral-400 font-medium uppercase tracking-wide text-right">Actions</span>
              </div>

              {/* List Content */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-2 border-neutral-700 border-t-[#8b53ff] rounded-full animate-spin" />
                </div>
              ) : links.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-14 h-14 bg-neutral-800 flex items-center justify-center mx-auto mb-5 rounded-xl">
                    <svg className="w-7 h-7 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                  <h3 className="text-[18px] font-semibold text-white mb-2">No payment links yet</h3>
                  <p className="text-[15px] text-neutral-500 mb-6">Create your first link to start accepting payments</p>
                  <Button
                    onClick={() => setShowCreateForm(true)}
                    className="bg-[#8b53ff] hover:bg-[#7a45e6] text-white text-[15px] h-11 px-6 font-medium rounded-lg"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Create Your First Link
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-neutral-800">
                  {links.map((link) => (
                    <div
                      key={link.id}
                      className="grid grid-cols-[2fr_150px_120px_140px_180px] gap-6 px-6 py-5 items-center hover:bg-[#1a1a1a]"
                    >
                      {/* Name & Slug */}
                      <div className="min-w-0">
                        <h3 className="text-[16px] font-medium text-white truncate">{link.name}</h3>
                        <p className="text-[14px] text-neutral-500 truncate font-mono mt-1">/{link.slug}</p>
                      </div>

                      {/* Amount */}
                      <div>
                        {link.amount ? (
                          <span className="text-[16px] font-semibold text-white">${parseFloat(link.amount).toFixed(2)}</span>
                        ) : (
                          <span className="text-[15px] text-neutral-500">Variable</span>
                        )}
                      </div>

                      {/* Status */}
                      <div>
                        {link.active ? (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 text-[13px] font-semibold rounded-full">
                            <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-neutral-700 text-neutral-400 text-[13px] font-semibold rounded-full">
                            <span className="w-2 h-2 bg-neutral-500 rounded-full" />
                            Inactive
                          </span>
                        )}
                      </div>

                      {/* Created Date */}
                      <div>
                        <span className="text-[14px] text-neutral-400">{formatDate(link.createdAt)}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => copyLink(link.url, link.id)}
                          className="flex items-center justify-center w-9 h-9 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg"
                          title="Copy link"
                        >
                          {copied === link.id ? (
                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                        <button
                          onClick={() => shareLink(link)}
                          className="flex items-center justify-center w-9 h-9 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg"
                          title="Share link"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                          </svg>
                        </button>
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center w-9 h-9 bg-[#8b53ff] hover:bg-[#7a45e6] text-white rounded-lg"
                          title="Open link"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center justify-center w-9 h-9 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                              </svg>
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 bg-[#1a1a1a] border-neutral-700">
                            <DropdownMenuItem className="text-neutral-300 focus:text-white focus:bg-neutral-800 text-[14px]">
                              Edit Link
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-neutral-300 focus:text-white focus:bg-neutral-800 text-[14px]">
                              View Analytics
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-neutral-700" />
                            <DropdownMenuItem className="text-red-400 focus:text-red-300 focus:bg-red-500/10 text-[14px]">
                              Delete Link
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
