"use client";

// External Imports
import React, { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, Settings, LogOut, Shield, Calendar, Clock 
} from 'lucide-react';

// Internal Imports
import { useAuth } from '@/context/AuthContext';

// Types & Interfaces
interface Profile {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

interface HrHeaderDropdownProps {
  profile: Profile | null;
  isDropdownOpen: boolean;
  setIsDropdownOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function HrHeaderDropdown({ 
  profile, 
  isDropdownOpen, 
  setIsDropdownOpen 
}: HrHeaderDropdownProps) {
  const { logout } = useAuth();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside of dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsDropdownOpen]);

  // Event Handlers
  const handleLogout = async (): Promise<void> => {
    if (logout) {
      await logout();
      router.push('/login');
    }
  };

  const handleViewProfile = (): void => {
    router.push('/profile');
    setIsDropdownOpen(false);
  };

  const handleSettings = (): void => {
    router.push('/settings');
    setIsDropdownOpen(false);
  };

  // Helper: Get avatar URL
  const getAvatarUrl = (): string => {
    if (profile?.name) {
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=4F46E5&color=fff&length=2`;
    }
    return 'https://ui-avatars.com/api/?name=User&background=4F46E5&color=fff';
  };

  const avatarUrl = getAvatarUrl();

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Trigger */}
      <div 
        className="flex items-center gap-2 sm:gap-3 cursor-pointer sm:pl-4 sm:border-l border-slate-200 group"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
      >
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden bg-indigo-500 flex items-center justify-center">
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
            {profile?.role || 'Employee'}
          </span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} 
        />
      </div>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-50">
          
          {/* Dropdown: User Info Section */}
          <div className="p-3 sm:p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-indigo-500 flex items-center justify-center">
                <img 
                  src={avatarUrl}
                  alt={profile?.name || 'User'}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-800 text-sm sm:text-base truncate">
                  {profile?.name || 'User'}
                </h4>
                <p className="text-xs text-slate-500 truncate">
                  {profile?.email || 'user@example.com'}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full">
                    {profile?.role || 'Employee'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Dropdown: Account Details Section */}
          <div className="p-2 sm:p-3 border-b border-slate-100">
            <p className="text-xs font-medium text-slate-400 mb-2 px-2">ACCOUNT DETAILS</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 px-2 py-1">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                <span className="truncate">
                  Member since: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-600 px-2 py-1">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
                <span className="truncate">
                  Last updated: {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Dropdown: Menu Items */}
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

            {profile?.role === 'ADMIN' && (
              <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-md transition-colors">
                <Shield className="w-4 h-4 text-slate-500" />
                <span>Admin Panel</span>
              </button>
            )}
          </div>

          {/* Dropdown: Logout Button */}
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
  );
}

// Need to import ChevronDown since it's used in the trigger
import { ChevronDown } from 'lucide-react';