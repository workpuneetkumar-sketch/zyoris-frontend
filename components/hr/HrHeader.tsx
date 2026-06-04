"use client";

// 1. External Imports
import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, Bell, Mail, ChevronDown, User, 
  Settings, LogOut, Shield, Calendar, Clock 
} from 'lucide-react';

// 2. Internal Imports
import { useAuth } from '@/context/AuthContext';

// 3. Interfaces
interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export default function HrHeader() {
  // ==========================================
  // Hooks & State Management
  // ==========================================
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ==========================================
  // Effects
  // ==========================================
  
  // Sync user context with profile state
  useEffect(() => {
    if (user) {
      // Create a local type assertion to tell TypeScript these fields might exist
      const u = user as typeof user & { createdAt?: string; updatedAt?: string };
      
      setProfile({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role || 'Employee',
        createdAt: u.createdAt || '',
        updatedAt: u.updatedAt || '',
      });
    }
  }, [user]);

  // Handle clicking outside of dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ==========================================
  // Helper Functions & Derived State
  // ==========================================
  const getUserInitials = () => {
    if (profile?.name) {
      return profile.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return 'U';
  };

  const avatarUrl = profile?.name 
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=4F46E5&color=fff&length=2`
    : 'https://ui-avatars.com/api/?name=User&background=4F46E5&color=fff';

  // ==========================================
  // Event Handlers
  // ==========================================
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

  // ==========================================
  // Render
  // ==========================================
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
      
      {/* --- Left Side: Page Title & Subtitle --- */}
      <div>
        <h1 className="text-[30px] font-semibold text-slate-800">HR Portal</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your workforce and HR operations in one place.
        </p>
      </div>

      {/* --- Right Side: Global Actions & Profile --- */}
      <div className="flex items-center gap-6">
        
        {/* Search Bar */}
        <div className="relative hidden md:block">
          <input
            type="text"
            placeholder="Search employees, documents, leave..."
            className="w-[320px] pl-4 pr-10 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
          />
          <Search className="w-[18px] h-[18px] text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors bg-white">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
              5
            </span>
          </button>
          
          <button className="relative p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors bg-white">
            <Mail className="w-5 h-5 text-slate-600" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
              3
            </span>
          </button>
        </div>

        {/* User Profile Trigger & Dropdown */}
        <div className="relative" ref={dropdownRef}>
          
          {/* Profile Trigger */}
          <div 
            className="flex items-center gap-3 cursor-pointer pl-4 border-l border-slate-200 group"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden bg-indigo-500 flex items-center justify-center">
              <img 
                src={avatarUrl}
                alt={profile?.name || 'User'}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="hidden sm:flex flex-col text-sm">
              <span className="font-semibold text-slate-800">
                {profile?.name || 'Loading...'}
              </span>
              <span className="text-xs text-slate-500">
                {profile?.role || 'Employee'}
              </span>
            </div>
            <ChevronDown 
              className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
            />
          </div>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200">
              
              {/* Dropdown: User Info Section */}
              <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-indigo-500 flex items-center justify-center">
                    <img 
                      src={avatarUrl}
                      alt={profile?.name || 'User'}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-800">{profile?.name || 'User'}</h4>
                    <p className="text-xs text-slate-500">{profile?.email || 'user@example.com'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                        {profile?.role || 'Employee'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Dropdown: Account Details Section */}
              <div className="p-3 border-b border-slate-100">
                <p className="text-xs font-medium text-slate-400 mb-2 px-2">ACCOUNT DETAILS</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-slate-600 px-2 py-1">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Member since: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 px-2 py-1">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Last updated: {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Dropdown: Menu Items */}
              <div className="p-2">
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

                {profile?.role === 'ADMIN' && (
                  <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors">
                    <Shield className="w-4 h-4 text-slate-500" />
                    <span>Admin Panel</span>
                  </button>
                )}
              </div>

              {/* Dropdown: Logout Button */}
              <div className="p-2 border-t border-slate-100">
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
  );
}