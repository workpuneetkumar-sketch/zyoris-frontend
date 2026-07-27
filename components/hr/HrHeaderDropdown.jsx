"use client";

import React, { useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, User, Settings, Shield, LogOut } from 'lucide-react';

// TypeScript Interface
interface HrHeaderDropdownProps {
  profile: {
    id: string;
    email: string;
    name: string;
    role: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => Promise<void>;
  avatarUrl: string;
}

export default function HrHeaderDropdown({ 
  profile, 
  isOpen, 
  onClose, 
  onLogout, 
  avatarUrl 
}: HrHeaderDropdownProps) {
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside of dropdown to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Event Handlers
  const handleViewProfile = () => {
    router.push('/profile');
    onClose();
  };

  const handleSettings = () => {
    router.push('/settings');
    onClose();
  };

  const handleLogout = async () => {
    await onLogout();
    router.push('/login');
  };

  if (!isOpen) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden z-50 animate-in slide-in-from-top-2 duration-200"
    >
      {/* Dropdown: User Info Section */}
      <div className="p-3 sm:p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden bg-indigo-500 flex items-center justify-center shrink-0">
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
              <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-medium">
                {profile?.role || 'Employee'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dropdown: Account Details Section */}
      <div className="p-2 sm:p-3 border-b border-slate-100">
        <p className="text-xs font-medium text-slate-400 mb-2 px-2 uppercase tracking-wider">
          Account Details
        </p>
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
  );
}