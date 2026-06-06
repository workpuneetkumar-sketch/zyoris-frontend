"use client";

// External Imports
import React, { useEffect, useState } from 'react';
import { Search, Bell, Mail } from 'lucide-react';

// Internal Imports
import { useAuth } from '@/context/AuthContext';
import HrHeaderDropdown from './HrHeaderDropdown';

// Types & Interfaces
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
  const { user } = useAuth();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);

  // ==========================================
  // Effects
  // ==========================================
  
  // Sync user context with profile state
  useEffect(() => {
    if (user) {
      // Type assertion for extended user properties
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

  // ==========================================
  // Render
  // ==========================================
  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Main Header Row */}
      <div className="flex justify-between items-start md:items-center gap-4">
        
        {/* --- Left Side: Page Title & Subtitle --- */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-[30px] font-semibold text-slate-800">HR Portal</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 line-clamp-2">
            Manage your workforce and HR operations in one place.
          </p>
        </div>

        {/* --- Right Side: Global Actions & Profile --- */}
        <div className="flex items-center gap-3 sm:gap-6 shrink-0">
          
          {/* Search Bar - Hidden on mobile, shown on desktop */}
          <div className="relative hidden lg:block">
            <input
              type="text"
              placeholder="Search employees, documents, leave..."
              className="w-[280px] xl:w-[320px] pl-4 pr-10 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
            />
            <Search className="w-[18px] h-[18px] text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
          </div>

          {/* Mobile Search Button */}
          <button className="lg:hidden p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors bg-white">
            <Search className="w-5 h-5 text-slate-600" />
          </button>

          {/* Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button className="relative p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors bg-white">
              <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                5
              </span>
            </button>
            
            <button className="relative p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors bg-white hidden sm:block">
              <Mail className="w-5 h-5 text-slate-600" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                3
              </span>
            </button>
          </div>

          {/* User Profile Dropdown Component */}
          <HrHeaderDropdown 
            profile={profile}
            isDropdownOpen={isDropdownOpen}
            setIsDropdownOpen={setIsDropdownOpen}
          />
          
        </div>
      </div>
    </div>
  );
}