"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Plus, 
  Filter, 
  MoreVertical, 
  X, 
  UserPlus, 
  Link as LinkIcon 
} from 'lucide-react';

// Mock Data for Employees
const employeesData = [
  { id: 1, name: 'Alex Morgan', email: 'alex@zyoris.com', department: 'HR', role: 'HR Manager', joinDate: 'Jan 12, 2022', status: 'Active', avatar: 'https://i.pravatar.cc/150?u=alex' },
  { id: 2, name: 'Taylor Smith', email: 'taylor@zyoris.com', department: 'Engineering', role: 'Frontend Developer', joinDate: 'Mar 05, 2023', status: 'Active', avatar: 'https://i.pravatar.cc/150?u=1' },
  { id: 3, name: 'Jordan Lee', email: 'jordan@zyoris.com', department: 'Sales', role: 'Sales Executive', joinDate: 'Nov 20, 2023', status: 'On Leave', avatar: 'https://i.pravatar.cc/150?u=2' },
  { id: 4, name: 'Casey Williams', email: 'casey@zyoris.com', department: 'Marketing', role: 'Content Strategist', joinDate: 'Jul 15, 2021', status: 'Active', avatar: 'https://i.pravatar.cc/150?u=3' },
  { id: 5, name: 'Morgan Davis', email: 'morgan@zyoris.com', department: 'Engineering', role: 'Backend Developer', joinDate: 'Sep 01, 2023', status: 'Active', avatar: 'https://i.pravatar.cc/150?u=5' },
];

export default function EmployeesPage() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMethod, setAddMethod] = useState<'new' | 'link'>('new');

  return (
    <div className="min-h-screen bg-[#fafbfc] p-8 flex flex-col gap-6 w-full">
      
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-800">Employees</h1>
          <p className="text-sm text-slate-500 mt-1">Manage your team members and their details.</p>
        </div>
        
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* 2. Filters & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:w-[320px]">
          <input
            type="text"
            placeholder="Search by name, role, or department..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        </div>
        
        <button className="flex items-center justify-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* 3. Employee Table */}
      <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Join Date</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {employeesData.map((employee) => (
                <tr key={employee.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={employee.avatar} alt={employee.name} className="w-9 h-9 rounded-full object-cover bg-slate-100 border border-slate-200" />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-800">{employee.name}</span>
                        <span className="text-xs text-slate-500">{employee.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600 font-medium">{employee.department}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{employee.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{employee.joinDate}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                      employee.status === 'Active' 
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                        : 'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {/* Link to Employee Detail Page */}
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/hr/employees/${employee.id}`}>
                        <span className="text-xs font-medium text-blue-600 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity mr-2">
                          View Profile
                        </span>
                      </Link>
                      <button className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Add Employee Modal Overlay */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Add New Employee</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Toggle: Create New vs Link Existing */}
              <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                <button 
                  onClick={() => setAddMethod('new')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${addMethod === 'new' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <UserPlus className="w-4 h-4" />
                  Create New
                </button>
                <button 
                  onClick={() => setAddMethod('link')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${addMethod === 'link' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <LinkIcon className="w-4 h-4" />
                  Link Existing
                </button>
              </div>

              {/* Form Content based on Toggle */}
              {addMethod === 'new' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Full Name</label>
                    <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. Jane Doe" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Work Email</label>
                    <input type="email" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="jane@zyoris.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Department</label>
                      <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white">
                        <option>Engineering</option>
                        <option>HR</option>
                        <option>Sales</option>
                        <option>Marketing</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1.5">Role</label>
                      <input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="e.g. Developer" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Search Existing User Account</label>
                    <div className="relative">
                      <input type="text" className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Search by email or name..." />
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Linking an existing user will grant them employee access to the HR portal.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                {addMethod === 'new' ? 'Create Employee' : 'Link & Add'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}