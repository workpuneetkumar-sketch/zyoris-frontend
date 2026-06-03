import React from 'react';
import { Search, Bell, Mail, ChevronDown } from 'lucide-react';
import Image from 'next/image';

export default function HrHeader() {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full ">
      {/* Left Side: Page Title and Subtitle */}
      <div>
        <h1 className="text-[30px] font-semibold text-slate-800">HR Portal</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your workforce and HR operations in one place.
        </p>
      </div>

      {/* Right Side: Global Actions & Profile */}
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

        {/* Action Icons (Notifications & Messages) */}
        <div className="flex items-center gap-3">
          <button className="relative p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors bg-white">
            <Bell className="w-5 h-5 text-slate-600" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white box-content">
              5
            </span>
          </button>
          
          <button className="relative p-2 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors bg-white">
            <Mail className="w-5 h-5 text-slate-600" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white box-content">
              3
            </span>
          </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 cursor-pointer pl-4 border-l border-slate-200">
          <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100">
            {/* Replace src with your actual image path or Next/Image */}
            <img 
              src="https://i.pravatar.cc/150?u=alex" 
              alt="Alex Morgan" 
              className="w-full h-full object-cover" 
            />
          </div>
          <div className="hidden sm:flex flex-col text-sm">
            <span className="font-semibold text-slate-800">Alex Morgan</span>
            <span className="text-xs text-slate-500">HR Manager</span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-500" />
        </div>
        
      </div>
    </div>
  );
}