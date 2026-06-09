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
  Clock4,
  Users,
  ChevronRight
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
  
  // State Management
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

  // Data Fetching
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

  // Edit Modal Handlers
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

  // Formatting Utilities
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

  // Style Helpers
  const getStatusBadgeClass = (status: string | undefined) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'INACTIVE': return 'bg-gray-50 text-gray-600 border-gray-200';
      case 'ON_LEAVE': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getStatusDot = (status: string | undefined) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-500';
      case 'INACTIVE': return 'bg-gray-400';
      case 'ON_LEAVE': return 'bg-amber-500';
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
      'Engineering': 'from-blue-600 to-cyan-600',
      'HR': 'from-purple-600 to-pink-600',
      'Sales': 'from-emerald-600 to-teal-600',
      'Marketing': 'from-orange-600 to-red-600',
      'Design': 'from-violet-600 to-purple-600',
      'Finance': 'from-green-600 to-emerald-600',
      'Operations': 'from-indigo-600 to-blue-600'
    };
    return colors[dept || ''] || 'from-blue-600 to-indigo-600';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-gray-500">Loading employee profile...</p>
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
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl border border-gray-200 p-8 text-center shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-500 mb-6">{error || 'Employee not found'}</p>
          <Link href="/hr/employees" className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all">
            <ArrowLeft className="w-4 h-4" />
            Back to Employees
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        
        {/* Header Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link href="/hr/employees" className="group inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-indigo-600 transition-all w-fit">
            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-all shadow-sm">
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
            </div>
            Back to Employees
          </Link>
          
          <button 
            onClick={handleEditClick}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all active:scale-[0.98] shadow-sm"
          >
            <Pencil className="w-4 h-4 text-indigo-600" />
            Edit Profile
          </button>
        </div>

        {/* Profile Hero Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className={`h-32 sm:h-40 bg-gradient-to-r ${getDepartmentColor(employee.department)} relative overflow-hidden`}>
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 p-4 sm:p-8 opacity-20">
              <Building2 className="w-24 h-24 sm:w-32 sm:h-32 text-white" />
            </div>
          </div>
          
          <div className="px-4 sm:px-8 lg:px-10 pb-6 sm:pb-10 relative">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 -mt-12 sm:-mt-16 mb-6 sm:mb-10">
              <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-6 text-center sm:text-left">
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-2xl sm:rounded-3xl bg-white p-1.5 sm:p-2 shadow-xl shadow-gray-200/50 ring-4 ring-white relative flex-shrink-0">
                  <div className="w-full h-full bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-3xl sm:text-4xl font-black shadow-inner">
                    {employee.name?.charAt(0)?.toUpperCase() || employee.userId?.charAt(0)?.toUpperCase() || 'E'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 sm:-bottom-2 sm:-right-2 w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-100 flex items-center justify-center">
                    <div className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ${getStatusDot(employee.status)}`}></div>
                  </div>
                </div>
                <div className="pb-1 sm:pb-2">
                  <h1 className="text-2xl sm:text-4xl font-black text-gray-900 mb-1 sm:mb-2 tracking-tight break-words">{employee.name || 'N/A'}</h1>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4">
                    <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs sm:text-sm font-medium border border-gray-100">
                      <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 flex-shrink-0" />
                      <span className="truncate max-w-[150px] sm:max-w-none">{employee.email || 'N/A'}</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 bg-gray-50 text-gray-600 rounded-lg text-xs sm:text-sm font-medium border border-gray-100">
                      <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-500 flex-shrink-0" />
                      <span className="truncate max-w-[120px] sm:max-w-none">{employee.role || 'N/A'}</span>
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="pb-1 sm:pb-2 flex justify-center lg:block">
                <span className={`inline-flex items-center gap-2 sm:gap-2.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black border ${getStatusBadgeClass(employee.status)}`}>
                  <span className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full ${getStatusDot(employee.status)}`}></span>
                  {getStatusLabel(employee.status)}
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: 'User ID', value: employee.userId, icon: Hash, color: 'text-indigo-600', bg: 'bg-indigo-50', mono: true },
                { label: 'Department', value: employee.department, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Salary', value: formatCurrency(employee.salary), icon: IndianRupee, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { label: 'Join Date', value: formatDate(employee.joinDate), icon: CalendarDays, color: 'text-violet-600', bg: 'bg-violet-50' },
              ].map((card, i) => (
                <div key={i} className="group p-3 sm:p-5 rounded-xl sm:rounded-2xl bg-gray-50/50 border border-gray-100 hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all cursor-default">
                  <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-4">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${card.bg} flex items-center justify-center ${card.color} group-hover:scale-110 transition-transform shadow-sm flex-shrink-0`}>
                      <card.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{card.label}</p>
                      <p className={`text-sm sm:text-base font-bold text-gray-800 mt-0.5 truncate ${card.mono ? 'font-mono' : ''}`}>{card.value || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 sm:gap-8">
          {/* Attendance History */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-100 bg-gradient-to-r from-blue-50/30 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-blue-50 flex items-center justify-center shadow-sm border border-blue-100 flex-shrink-0">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">Attendance</h2>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">Recent records</p>
                </div>
              </div>
              <Link href={`/hr/attendance?employeeId=${employeeId}`} className="hidden sm:flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {attendanceHistory.length === 0 ? (
                <div className="px-4 py-16 sm:py-24 text-center">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-50 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-gray-100">
                    <Calendar className="w-8 h-8 sm:w-12 sm:h-12 text-gray-200" />
                  </div>
                  <p className="text-lg font-bold text-gray-800 mb-1">No attendance records</p>
                  <p className="text-sm font-medium text-gray-400">Records will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:-mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <th className="px-4 sm:px-8 py-3 sm:py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left whitespace-nowrap">Date</th>
                          <th className="px-4 sm:px-8 py-3 sm:py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left whitespace-nowrap">Check In</th>
                          <th className="px-4 sm:px-8 py-3 sm:py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left whitespace-nowrap">Check Out</th>
                          <th className="px-4 sm:px-8 py-3 sm:py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {attendanceHistory.slice(0, 5).map((record) => (
                          <tr key={record.id} className="hover:bg-blue-50/20 transition-colors group">
                            <td className="px-4 sm:px-8 py-3 sm:py-5 whitespace-nowrap">
                              <span className="font-bold text-gray-800">{formatDate(record.attendanceDate)}</span>
                            </td>
                            <td className="px-4 sm:px-8 py-3 sm:py-5 whitespace-nowrap">
                              <div className="flex items-center gap-2 sm:gap-2.5">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors flex-shrink-0">
                                  <Clock4 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-500" />
                                </div>
                                <span className="font-semibold text-gray-600">{record.checkIn ? formatTime(record.checkIn) : '-'}</span>
                              </div>
                            </td>
                            <td className="px-4 sm:px-8 py-3 sm:py-5 whitespace-nowrap">
                              <div className="flex items-center gap-2 sm:gap-2.5">
                                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors flex-shrink-0">
                                  <Clock4 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-400" />
                                </div>
                                <span className="font-semibold text-gray-600">{record.checkOut ? formatTime(record.checkOut) : '-'}</span>
                              </div>
                            </td>
                            <td className="px-4 sm:px-8 py-3 sm:py-5 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-black border ${getAttendanceStatusBadgeClass(record.status)}`}>
                                {record.status || 'N/A'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            {attendanceHistory.length > 5 && (
              <div className="px-4 sm:px-8 py-3 border-t border-gray-100 bg-gray-50/30">
                <Link href={`/hr/attendance?employeeId=${employeeId}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  View all {attendanceHistory.length} records <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>

          {/* Leave History */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-4 sm:px-8 py-4 sm:py-6 border-b border-gray-100 bg-gradient-to-r from-purple-50/30 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-purple-50 flex items-center justify-center shadow-sm border border-purple-100 flex-shrink-0">
                  <CalendarRange className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">Leave History</h2>
                  <p className="text-xs font-medium text-gray-500 mt-0.5">Recent applications</p>
                </div>
              </div>
              <Link href={`/hr/leaves?employeeId=${employeeId}`} className="hidden sm:flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {leaveHistory.length === 0 ? (
                <div className="px-4 py-16 sm:py-24 text-center">
                  <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-50 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 border border-gray-100">
                    <CalendarRange className="w-8 h-8 sm:w-12 sm:h-12 text-gray-200" />
                  </div>
                  <p className="text-lg font-bold text-gray-800 mb-1">No leave requests</p>
                  <p className="text-sm font-medium text-gray-400">Leave history will appear here.</p>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:-mx-0">
                  <div className="inline-block min-w-full align-middle">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <th className="px-4 sm:px-8 py-3 sm:py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left whitespace-nowrap">Type</th>
                          <th className="px-4 sm:px-8 py-3 sm:py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left whitespace-nowrap">Period</th>
                          <th className="px-4 sm:px-8 py-3 sm:py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left whitespace-nowrap">Reason</th>
                          <th className="px-4 sm:px-8 py-3 sm:py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-left whitespace-nowrap">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {leaveHistory.slice(0, 5).map((leave) => (
                          <tr key={leave.id} className="hover:bg-purple-50/20 transition-colors group">
                            <td className="px-4 sm:px-8 py-3 sm:py-5 whitespace-nowrap">
                              <span className="font-bold text-gray-800">{leave.type}</span>
                            </td>
                            <td className="px-4 sm:px-8 py-3 sm:py-5 whitespace-nowrap">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-700">{formatDate(leave.startDate)}</span>
                                <span className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">to {formatDate(leave.endDate)}</span>
                              </div>
                            </td>
                            <td className="px-4 sm:px-8 py-3 sm:py-5">
                              <p className="text-gray-600 font-medium truncate max-w-[100px] sm:max-w-[150px]">{leave.reason}</p>
                            </td>
                            <td className="px-4 sm:px-8 py-3 sm:py-5 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-black border ${getLeaveStatusBadgeClass(leave.status)}`}>
                                {leave.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            {leaveHistory.length > 5 && (
              <div className="px-4 sm:px-8 py-3 border-t border-gray-100 bg-gray-50/30">
                <Link href={`/hr/leaves?employeeId=${employeeId}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  View all {leaveHistory.length} requests <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden border border-gray-200 flex flex-col">
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 sm:px-8 py-4 sm:py-5 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">Edit Profile</h3>
                <p className="text-xs text-indigo-100 mt-0.5">Update employee information</p>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-indigo-200 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors">
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
                )}

                <div className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                      <input 
                        type="text" 
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 text-gray-900 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                      <input 
                        type="email" 
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3 border border-gray-200 text-gray-900 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                        placeholder="Enter email address"
                      />
                    </div>
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Salary</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <IndianRupee className="h-4 w-4 text-gray-400" />
                        </div>
                        <input 
                          type="number" 
                          value={editForm.salary || ''}
                          onChange={(e) => setEditForm(prev => ({ ...prev, salary: e.target.value ? Number(e.target.value) : undefined }))}
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 text-gray-900 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all" 
                          placeholder="Enter salary"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Join Date</label>
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
              </div>
            </div>

            <div className="px-6 sm:px-8 py-4 sm:py-5 bg-gray-50 border-t border-gray-100 flex flex-col sm:flex-row justify-end gap-3 flex-shrink-0">
              <button 
                onClick={() => setIsEditModalOpen(false)} 
                className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all order-2 sm:order-1"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all order-1 sm:order-2 shadow-sm"
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