"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
  CalendarRange, 
  Clock, 
  Loader2, 
  AlertCircle,
  User,
  Mail,
  Building2,
  CalendarDays,
  IndianRupee,
  Hash,
  Pencil,
  X,
  CheckCircle2,
  Save,
  Briefcase,
  Clock4
} from 'lucide-react';
import { 
  getEmployeeById, 
  updateEmployee,
  fetchAttendance, 
  fetchLeaves, 
  type Employee, 
  type Attendance, 
  type LeaveRequest,
  type UpdateEmployeeData 
} from '@/lib/api/hrApi';

const DEPARTMENTS = ['Engineering', 'HR', 'Sales', 'Marketing', 'Design', 'Finance', 'Operations'];

export default function EmployeeDetailPage() {
  const params = useParams();
  const employeeId = params.employeeId as string;
  
  // ─── State Management ───
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([]);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editForm, setEditForm] = useState<UpdateEmployeeData>({});

  // ─── Data Fetching ───
  const fetchEmployeeData = async () => {
    if (!employeeId) {
      console.warn('[DEBUG] No employee ID provided in params');
      setError('No employee ID provided');
      setIsLoading(false);
      return;
    }

    console.log('[DEBUG] fetchEmployeeData request:', employeeId);
    try {
      setIsLoading(true);
      setError(null);
      
      const employeeData = await getEmployeeById(employeeId);
      console.log('[DEBUG] fetchEmployeeData success:', employeeData);
      
      if (employeeData) {
        setEmployee({
          ...employeeData,
          name: employeeData.name || 'Unknown',
          email: employeeData.email || 'No email',
          role: employeeData.role || 'No role assigned'
        });
      }
      
      try {
        const [attendanceData, leaveData] = await Promise.all([
          fetchAttendance({ employeeId }),
          fetchLeaves({ employeeId })
        ]);
        
        setAttendanceHistory(attendanceData || []);
        setLeaveHistory(leaveData || []);
      } catch (err) {
        console.warn('Failed to fetch attendance/leave data:', err);
        setAttendanceHistory([]);
        setLeaveHistory([]);
      }
      
    } catch (err: any) {
      console.error('Error fetching employee data:', err);
      if (err.response?.status === 404) {
        setError('Employee not found.');
      } else {
        setError(err.message || 'Failed to load employee data.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
  }, [employeeId]);

  // ─── Edit Modal Handlers ───
  const handleEditClick = () => {
    if (employee) {
      setEditForm({
        name: employee.name || '',
        email: employee.email || '',
        department: employee.department || 'Engineering',
        role: employee.role || '',
        salary: employee.salary,
        joinDate: employee.joinDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        status: employee.status || 'ACTIVE'
      });
      setSaveError(null);
      setSaveSuccess(false);
      setIsEditModalOpen(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!employee) return;

    try {
      setIsSaving(true);
      setSaveError(null);
      setSaveSuccess(false);

      // STRICT: Only allow department, salary, joinDate
      const updateData: UpdateEmployeeData = {
        department: editForm.department,
        salary: editForm.salary !== undefined ? Number(editForm.salary) : undefined,
        joinDate: editForm.joinDate
      };
      
      console.log('[DEBUG] handleSaveEdit - employee.id:', employeeId);
      console.log('[DEBUG] handleSaveEdit - payload:', updateData);
      
      const updatedEmployee = await updateEmployee(employeeId, updateData);
      console.log('[DEBUG] handleSaveEdit success:', updatedEmployee);
      
      setEmployee(updatedEmployee);
      setSaveSuccess(true);
      
      setTimeout(async () => {
        setIsEditModalOpen(false);
        setSaveSuccess(false);
      }, 1500);
      
    } catch (err: any) {
      console.error('[DEBUG] handleSaveEdit error:', err);
      setSaveError(err.message || 'Failed to update employee.');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Formatting Utilities ───
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return dateString;
    }
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  const formatCurrency = (amount?: number) => {
    if (amount === undefined || amount === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // ─── Style Helpers ───
  const getStatusBadgeClass = (status: string | undefined) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-100';
      case 'INACTIVE': return 'bg-gray-50 text-gray-600 border-gray-200 ring-1 ring-gray-100';
      case 'ON_LEAVE': return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-100';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getStatusDot = (status: string | undefined) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-500 shadow-sm shadow-emerald-200';
      case 'INACTIVE': return 'bg-gray-400 shadow-sm shadow-gray-200';
      case 'ON_LEAVE': return 'bg-amber-500 shadow-sm shadow-amber-200';
      default: return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: string | undefined) => {
    switch (status) {
      case 'ACTIVE': return 'Active';
      case 'INACTIVE': return 'Inactive';
      case 'ON_LEAVE': return 'On Leave';
      default: return status || 'N/A';
    }
  };

  const getLeaveStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'REJECTED': return 'bg-red-50 text-red-600 border-red-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getAttendanceStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'Present': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Late': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Absent': return 'bg-red-50 text-red-600 border-red-200';
      case 'Half Day': return 'bg-blue-50 text-blue-600 border-blue-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getDepartmentColor = (dept: string | undefined) => {
    const colors: Record<string, string> = {
      'Engineering': 'from-blue-500 to-cyan-500',
      'HR': 'from-purple-500 to-pink-500',
      'Sales': 'from-emerald-500 to-teal-500',
      'Marketing': 'from-orange-500 to-red-500',
      'Design': 'from-violet-500 to-purple-500',
      'Finance': 'from-green-500 to-emerald-500',
      'Operations': 'from-indigo-500 to-blue-500'
    };
    return colors[dept || ''] || 'from-blue-500 to-indigo-500';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading employee profile...</p>
        </div>
      </div>
    );
  }

  if (error || !employee) {
    if (!isLoading && !employee && !error) {
      notFound();
      return null;
    }
    return (
      <div className="min-h-screen bg-slate-50/50 p-8">
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error</h2>
          <p className="text-slate-500 mb-6">{error || 'Employee not found'}</p>
          <Link href="/hr/employees" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all">
            <ArrowLeft className="w-4 h-4" />
            Back to Employees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50/50">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 space-y-8">
        
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link href="/hr/employees" className="group inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-blue-600 transition-all">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center group-hover:border-blue-200 group-hover:bg-blue-50 transition-all">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </div>
            Back to Employees
          </Link>
          
          <button 
            onClick={handleEditClick}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all active:scale-[0.98]"
          >
            <Pencil className="w-4 h-4 text-blue-600" />
            Edit Profile
          </button>
        </div>

        {/* Profile Hero Card */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
          <div className={`h-40 bg-gradient-to-r ${getDepartmentColor(employee.department)} relative overflow-hidden`}>
            <div className="absolute inset-0 bg-black/5"></div>
            <div className="absolute top-0 right-0 p-8 opacity-20">
              <Building2 className="w-32 h-32 text-white" />
            </div>
          </div>
          
          <div className="px-8 lg:px-10 pb-10 relative">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 -mt-16 mb-10">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6 text-center sm:text-left">
                <div className="w-32 h-32 rounded-3xl bg-white p-2 shadow-xl shadow-slate-200/50 ring-4 ring-white relative group">
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-2xl flex items-center justify-center text-4xl font-black shadow-inner">
                    {employee.name?.charAt(0)?.toUpperCase() || employee.userId?.charAt(0)?.toUpperCase() || 'E'}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-2xl shadow-lg border border-slate-100 flex items-center justify-center">
                    <div className={`w-3 h-3 rounded-full ${getStatusDot(employee.status)} animate-pulse`}></div>
                  </div>
                </div>
                <div className="pb-2">
                  <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tight">{employee.name || 'N/A'}</h1>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium border border-slate-100">
                      <Mail className="w-4 h-4 text-blue-500" />
                      {employee.email || 'N/A'}
                    </span>
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium border border-slate-100">
                      <Briefcase className="w-4 h-4 text-indigo-500" />
                      {employee.role || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="pb-2 flex justify-center lg:block">
                <span className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-sm font-black border shadow-sm ${getStatusBadgeClass(employee.status)}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${getStatusDot(employee.status)}`}></span>
                  {getStatusLabel(employee.status)}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'User ID', value: employee.userId, icon: Hash, color: 'text-indigo-600', bg: 'bg-indigo-50', mono: true },
                { label: 'Department', value: employee.department, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Salary', value: formatCurrency(employee.salary), icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Join Date', value: formatDate(employee.joinDate), icon: CalendarDays, color: 'text-violet-600', bg: 'bg-violet-50' },
              ].map((card, i) => (
                <div key={i} className="group p-5 rounded-2xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:border-blue-200 hover:shadow-md hover:shadow-blue-500/5 transition-all cursor-default">
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-12 h-12 rounded-xl ${card.bg} flex items-center justify-center ${card.color} group-hover:scale-110 transition-transform shadow-sm`}>
                      <card.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</p>
                      <p className={`text-base font-bold text-slate-800 mt-0.5 ${card.mono ? 'font-mono' : ''}`}>{card.value || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Attendance History */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/30 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center shadow-sm border border-blue-100">
                  <Clock className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Attendance History</h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Recent attendance records</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              {attendanceHistory.length === 0 ? (
                <div className="px-6 py-24 text-center">
                  <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-100">
                    <Calendar className="w-12 h-12 text-slate-200" />
                  </div>
                  <p className="text-lg font-bold text-slate-800 mb-1">No attendance records</p>
                  <p className="text-sm font-medium text-slate-400">Records will appear here once available.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Date</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Check In</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Check Out</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {attendanceHistory.map((record) => (
                        <tr key={record.id} className="hover:bg-blue-50/20 transition-colors group">
                          <td className="px-8 py-5">
                            <span className="font-bold text-slate-800">{formatDate(record.attendanceDate)}</span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors">
                                <Clock4 className="w-4 h-4 text-blue-500" />
                              </div>
                              <span className="font-semibold text-slate-600">{record.checkIn ? formatTime(record.checkIn) : '-'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors">
                                <Clock4 className="w-4 h-4 text-slate-400" />
                              </div>
                              <span className="font-semibold text-slate-600">{record.checkOut ? formatTime(record.checkOut) : '-'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] font-black border shadow-sm ${getAttendanceStatusBadgeClass(record.status)}`}>
                              {record.status || 'N/A'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Leave History */}
          <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden flex flex-col">
            <div className="px-8 py-6 border-b border-slate-100 bg-gradient-to-r from-purple-50/30 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center shadow-sm border border-purple-100">
                  <CalendarRange className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Leave History</h2>
                  <p className="text-xs font-medium text-slate-500 mt-0.5">Recent leave applications</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1">
              {leaveHistory.length === 0 ? (
                <div className="px-6 py-24 text-center">
                  <div className="w-24 h-24 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-slate-100">
                    <CalendarRange className="w-12 h-12 text-slate-200" />
                  </div>
                  <p className="text-lg font-bold text-slate-800 mb-1">No leave requests</p>
                  <p className="text-sm font-medium text-slate-400">Leave history will appear here once available.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Type</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Period</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Reason</th>
                        <th className="px-8 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {leaveHistory.map((leave) => (
                        <tr key={leave.id} className="hover:bg-purple-50/20 transition-colors group">
                          <td className="px-8 py-5">
                            <span className="font-bold text-slate-800">{leave.type}</span>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-700">{formatDate(leave.startDate)}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">to {formatDate(leave.endDate)}</span>
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <p className="text-slate-600 font-medium line-clamp-1 max-w-[150px]">{leave.reason}</p>
                          </td>
                          <td className="px-8 py-5">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-xl text-[11px] font-black border shadow-sm ${getLeaveStatusBadgeClass(leave.status)}`}>
                              {leave.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200/60">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Edit Profile</h3>
                <p className="text-xs text-blue-100 mt-0.5">Update employee information</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-blue-200 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8">
              {saveSuccess && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <p className="text-sm font-bold text-emerald-800">Employee updated successfully!</p>
                </div>
              )}

              {saveError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm font-medium text-red-800">{saveError}</p>
                </div>
              )}

              <div className="space-y-5">
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-400 mb-2">Full Name (Read-only)</label>
                    <input 
                      type="text" 
                      value={editForm.name || ''}
                      disabled
                      className="w-full px-4 py-3 border border-slate-100 bg-slate-50 text-slate-500 rounded-xl text-sm cursor-not-allowed" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-400 mb-2">Email Address (Read-only)</label>
                    <input 
                      type="email" 
                      value={editForm.email || ''}
                      disabled
                      className="w-full px-4 py-3 border border-slate-100 bg-slate-50 text-slate-500 rounded-xl text-sm cursor-not-allowed" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Department</label>
                    <select 
                      value={editForm.department || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-gray-900 text-sm bg-white"
                    >
                      {DEPARTMENTS.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-400 mb-2">Role (Read-only)</label>
                    <input 
                      type="text" 
                      value={editForm.role || ''}
                      disabled
                      className="w-full px-4 py-3 border border-slate-100 bg-slate-50 text-slate-500 rounded-xl text-sm cursor-not-allowed" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Salary</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <IndianRupee className="h-4 w-4 text-slate-400" />
                      </div>
                      <input 
                        type="number" 
                        value={editForm.salary || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, salary: e.target.value ? Number(e.target.value) : undefined }))}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" 
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Join Date</label>
                    <input 
                      type="date" 
                      value={editForm.joinDate || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, joinDate: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
                  <select 
                    value={editForm.status || 'ACTIVE'}
                    onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value as any }))}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl text-gray-900 text-sm bg-white"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ON_LEAVE">On Leave</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl">
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
