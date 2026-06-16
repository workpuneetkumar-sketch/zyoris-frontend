// components/finance/FinanceHeader.tsx
"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, Bell, Mail, ChevronDown, User, 
  Settings, LogOut, Shield, Calendar, Clock, 
  CreditCard, TrendingUp, DollarSign, Wallet
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { fetchExpenses } from '@/lib/api/finance/financeApi';
import { getInvoices, Invoice } from '@/lib/api/finance/invoicesApi';

interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface FinanceStats {
  totalRevenue: string;
  totalExpenses: string;
  netProfit: string;
  cashFlow: string;
}

export default function FinanceHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [financeStats, setFinanceStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadFinanceData = async () => {
      try {
        // Use your own real API functions
        const [expenses, invoices] = await Promise.all([
          fetchExpenses(),   // all expenses
          getInvoices(),     // all invoices
        ]);

        const paidInvoices = invoices.filter((inv: Invoice) => inv.status === 'PAID');
        const totalRevenue = paidInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);

        const realisedExpenses = expenses.filter(
          exp => exp.status === 'APPROVED' || exp.status === 'REIMBURSED'
        );
        const totalExpenses = realisedExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        const netProfit = totalRevenue - totalExpenses;

        const formatCurrency = (amount: number) => {
          if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`;
          if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`;
          if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
          return `₹${amount}`;
        };

        setFinanceStats({
          totalRevenue: formatCurrency(totalRevenue),
          totalExpenses: formatCurrency(totalExpenses),
          netProfit: formatCurrency(netProfit),
          cashFlow: netProfit >= 0 ? 'Positive' : 'Negative',
        });
      } catch (error) {
        console.error('Failed to fetch finance data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFinanceData();
  }, []);

  useEffect(() => {
    if (user) {
      const u = user as typeof user & { createdAt?: string; updatedAt?: string };
      setProfile({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role || 'Finance Manager',
        createdAt: u.createdAt || new Date().toISOString(),
        updatedAt: u.updatedAt || new Date().toISOString(),
      });
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const avatarUrl = profile?.name 
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=2563EB&color=fff&length=2`
    : 'https://ui-avatars.com/api/?name=Finance&background=2563EB&color=fff&length=2';

  const handleLogout = async () => {
    if (logout) {
      await logout();
      router.push('/login');
    }
  };

  const handleViewProfile = () => {
    router.push('/profile');
    setIsDropdownOpen(false);
  };

  const handleSettings = () => {
    router.push('/settings');
    setIsDropdownOpen(false);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex justify-between items-start md:items-center gap-4">
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-blue-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
            <h1 className="text-2xl sm:text-[30px] font-semibold text-slate-800">Finance Dashboard</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2">
            Get an overview of your financial performance and cash flow.
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
          
          <div className="relative hidden lg:block">
            <input
              type="text"
              placeholder="Search transactions, invoices, clients..."
              className="w-[280px] xl:w-[320px] pl-4 pr-10 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
            />
            <Search className="w-[18px] h-[18px] text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
          </div>

          <button className="lg:hidden p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors bg-white">
            <Search className="w-5 h-5 text-slate-600" />
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <button className="relative p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors bg-white">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                3
              </span>
            </button>
            
            <button className="relative p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors bg-white hidden sm:block">
              <Mail className="w-5 h-5 text-slate-600" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                12
              </span>
            </button>
          </div>

          <div className="relative" ref={dropdownRef}>
            
            <div 
              className="flex items-center gap-2 sm:gap-3 cursor-pointer sm:pl-4 sm:border-l border-slate-200 group"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center">
                <img 
                  src={avatarUrl}
                  alt={profile?.name || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="hidden md:flex flex-col text-sm">
                <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                  {profile?.name || 'Loading...'}
                </span>
                <span className="text-xs text-slate-500">
                  {profile?.role || 'Finance Manager'}
                </span>
              </div>
              <ChevronDown 
                className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
              />
            </div>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-50">
                
                <div className="p-3 sm:p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-white">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-blue-600 flex items-center justify-center">
                      <img 
                        src={avatarUrl}
                        alt={profile?.name || 'User'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-800 text-sm sm:text-base truncate">{profile?.name || 'User'}</h4>
                      <p className="text-xs text-slate-500 truncate">{profile?.email || 'user@example.com'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          {profile?.role || 'Finance Manager'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50">
                  <p className="text-xs font-medium text-slate-500 mb-3 px-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    QUICK FINANCE STATS
                  </p>
                  {loading ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                      <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                    </div>
                  ) : financeStats && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white rounded-lg p-2 border border-slate-100">
                        <p className="text-[10px] text-slate-500">Revenue</p>
                        <p className="text-sm font-bold text-emerald-600">{financeStats.totalRevenue}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-slate-100">
                        <p className="text-[10px] text-slate-500">Expenses</p>
                        <p className="text-sm font-bold text-rose-600">{financeStats.totalExpenses}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-slate-100">
                        <p className="text-[10px] text-slate-500">Net Profit</p>
                        <p className="text-sm font-bold text-blue-600">{financeStats.netProfit}</p>
                      </div>
                      <div className="bg-white rounded-lg p-2 border border-slate-100">
                        <p className="text-[10px] text-slate-500">Cash Flow</p>
                        <p className="text-sm font-bold text-emerald-600">{financeStats.cashFlow}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-2 sm:p-3 border-b border-slate-100">
                  <p className="text-xs font-medium text-slate-400 mb-2 px-2">ACCOUNT DETAILS</p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 px-2 py-1">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                      <span className="truncate">Member since: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 px-2 py-1">
                      <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                      <span className="truncate">Last updated: {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="p-1 sm:p-2">
                  <button 
                    onClick={handleViewProfile}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>View Profile</span>
                  </button>
                  
                  <button 
                    onClick={handleSettings}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span>Settings</span>
                  </button>

                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors">
                    <CreditCard className="w-4 h-4 text-slate-500" />
                    <span>Billing & Invoices</span>
                  </button>

                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors">
                    <Wallet className="w-4 h-4 text-slate-500" />
                    <span>Payment Methods</span>
                  </button>

                  {profile?.role === 'ADMIN' && (
                    <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors">
                      <Shield className="w-4 h-4 text-slate-500" />
                      <span>Admin Panel</span>
                    </button>
                  )}
                </div>

                <div className="p-1 sm:p-2 border-t border-slate-100">
                  <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>

              </div>
            )}
          </div>
          
        </div>
      </div>

      {!loading && financeStats && (
        <div className="grid grid-cols-4 gap-2 md:hidden mt-2 pt-2 border-t border-slate-100">
          <div className="text-center">
            <p className="text-[10px] text-slate-500">Revenue</p>
            <p className="text-xs font-semibold text-emerald-600">{financeStats.totalRevenue}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500">Expenses</p>
            <p className="text-xs font-semibold text-rose-600">{financeStats.totalExpenses}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500">Profit</p>
            <p className="text-xs font-semibold text-blue-600">{financeStats.netProfit}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500">Cash Flow</p>
            <p className="text-xs font-semibold text-emerald-600">{financeStats.cashFlow}</p>
          </div>
        </div>
      )}
    </div>
  );
}