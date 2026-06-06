"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ArrowLeft, 
  Calendar, 
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
  Phone,
  MapPin,
  Briefcase,
  Award,
  TrendingUp,
  Clock4,
  FileText
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
      setError('No employee ID provided');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const employeeData = await getEmployeeById(employeeId);
      
      // Ensure we have all required fields
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
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Failed to load employee data.');
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

      // Send all form values for update
      const updateData: UpdateEmployeeData = {
        name: editForm.name,
        email: editForm.email,
        department: editForm.department,
        role: editForm.role,
        salary: editForm.salary,
        joinDate: editForm.joinDate,
        status: editForm.status
      };
      
      const updatedEmployee = await updateEmployee(employeeId, updateData);
      
      setEmployee(updatedEmployee);
      setSaveSuccess(true);
      
      // Close modal and refresh after success
      setTimeout(async () => {
        setIsEditModalOpen(false);
        setSaveSuccess(false);
        try {
          const freshData = await getEmployeeById(employeeId);
          if (freshData) {
            setEmployee({
              ...freshData,
              name: freshData.name || 'Unknown',
              role: freshData.role || 'No role assigned'
            });
          }
        } catch (err) {
          console.error('Failed to refresh employee data:', err);
        }
      }, 1500);
      
    } catch (err: any) {
      console.error('Error updating employee:', err);
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

  // ─── Loading State ───
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          <Link href="/hr/employees" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Employees
          </Link>
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="flex flex-col items-center gap-4 bg-white p-12 rounded-2xl shadow-sm border border-slate-200/60">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-100 rounded-full animate-spin border-t-blue-600"></div>
                <User className="w-6 h-6 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm font-medium text-slate-600">Loading employee details...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Error State ───
  if (error || !employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
          <Link href="/hr/employees" className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" />
            Back to Employees
          </Link>
          <div className="flex items-center justify-center min-h-[500px]">
            <div className="bg-white p-12 rounded-2xl border border-slate-200/60 shadow-sm max-w-md w-full text-center">
              <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {!employee ? 'Employee Not Found' : 'Error Loading Employee'}
              </h3>
              <p className="text-slate-500 mb-8">{error || 'The requested employee could not be found.'}</p>
              <div className="flex gap-3 justify-center">
                <Link href="/hr/employees" className="px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all">
                  Go Back
                </Link>
                <button onClick={() => window.location.reload()} className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-sm hover:shadow-md">
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Render ───
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/20">
      <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        
        {/* Header Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/hr/employees" className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800 transition-all">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Employees
          </Link>
          
          <button 
            onClick={handleEditClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all active:scale-[0.98]"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </button>
        </div>

        {/* Profile Hero Card */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden mb-8">
          {/* Gradient Banner */}
          <div className={`h-32 bg-gradient-to-r ${getDepartmentColor(employee.department)} relative overflow-hidden`}>
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          </div>
          
          <div className="px-8 lg:px-10 pb-10 relative">
            {/* Avatar & Quick Info */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 -mt-16 mb-8">
              <div className="flex items-end gap-6">
                <div className="w-28 h-28 rounded-2xl bg-white p-1.5 shadow-lg shadow-slate-200/50 ring-4 ring-white">
                  <div className="w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 rounded-xl flex items-center justify-center text-3xl font-bold">
                    {employee.name?.charAt(0)?.toUpperCase() || employee.userId?.charAt(0)?.toUpperCase() || 'E'}
                  </div>
                </div>
                <div className="pb-2">
                  <h1 className="text-3xl font-bold text-slate-900 mb-1">{employee.name || 'N/A'}</h1>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                      <Mail className="w-3.5 h-3.5" />
                      {employee.email || 'N/A'}
                    </span>
                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
                      <Briefcase className="w-3.5 h-3.5" />
                      {employee.role || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="pb-2">
                <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border ${getStatusBadgeClass(employee.status)}`}>
                  <span className={`w-2 h-2 rounded-full ${getStatusDot(employee.status)}`}></span>
                  {getStatusLabel(employee.status)}
                </span>
              </div>
            </div>
            
            {/* Info Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="group p-4 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all cursor-default">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                    <Hash className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">User ID</p>
                </div>
                <p className="text-sm font-bold text-slate-800 font-mono ml-[52px]">{employee.userId || 'N/A'}</p>
              </div>
              
              <div className="group p-4 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all cursor-default">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Department</p>
                </div>
                <p className="text-sm font-bold text-slate-800 ml-[52px]">{employee.department || 'N/A'}</p>
              </div>
              
              <div className="group p-4 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all cursor-default">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Salary</p>
                </div>
                <p className="text-sm font-bold text-slate-800 ml-[52px]">{formatCurrency(employee.salary)}</p>
              </div>
              
              <div className="group p-4 rounded-xl bg-slate-50/80 border border-slate-100 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all cursor-default">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Join Date</p>
                </div>
                <p className="text-sm font-bold text-slate-800 ml-[52px]">{formatDate(employee.joinDate)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tables Section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          
          {/* Attendance History */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Attendance History</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Recent attendance records</p>
                </div>
              </div>
            </div>
            
            {attendanceHistory.length === 0 ? (
              <div className="px-6 py-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-base font-semibold text-slate-700 mb-1">No attendance records</p>
                <p className="text-sm text-slate-500">Attendance data will appear here once available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Date</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Check In</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Check Out</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {attendanceHistory.map((record) => (
                      <tr key={record.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-semibold text-slate-800">{formatDate(record.attendanceDate)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock4 className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm text-slate-600">{record.checkIn ? formatTime(record.checkIn) : '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Clock4 className="w-3.5 h-3.5 text-slate-400" />
                            <span className="text-sm text-slate-600">{record.checkOut ? formatTime(record.checkOut) : '-'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getAttendanceStatusBadgeClass(record.status)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${record.status === 'Present' ? 'bg-emerald-500' : record.status === 'Late' ? 'bg-amber-500' : record.status === 'Absent' ? 'bg-red-500' : 'bg-blue-500'}`}></span>
                            {record.status || 'Present'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Leave History */}
          <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Leave Requests</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Leave application history</p>
                </div>
              </div>
            </div>
            
            {leaveHistory.length === 0 ? (
              <div className="px-6 py-20 text-center">
                <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-10 h-10 text-slate-300" />
                </div>
                <p className="text-base font-semibold text-slate-700 mb-1">No leave requests</p>
                <p className="text-sm text-slate-500">Leave history will appear here once available.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Type</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Duration</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Reason</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {leaveHistory.map((leave) => (
                      <tr key={leave.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-800 bg-slate-50 px-3 py-1.5 rounded-lg">
                            {leave.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-0.5">
                            <div className="text-sm font-medium text-slate-700">{formatDate(leave.startDate)}</div>
                            <div className="text-xs text-slate-400">to {formatDate(leave.endDate)}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-sm text-slate-600 max-w-[200px] truncate" title={leave.reason}>
                            {leave.reason}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getLeaveStatusBadgeClass(leave.status)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              leave.status === 'APPROVED' ? 'bg-emerald-500' : 
                              leave.status === 'PENDING' ? 'bg-amber-500' : 
                              leave.status === 'REJECTED' ? 'bg-red-500' : 'bg-gray-500'
                            }`}></span>
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

        {/* Edit Modal */}
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200/60">
              
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-5 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">Edit Profile</h3>
                  <p className="text-xs text-blue-100 mt-0.5">Update employee information</p>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-blue-200 hover:text-white hover:bg-white/10 p-2 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-8">
                {saveSuccess && (
                  <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 animate-in slide-in-from-top-2">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-800">Success!</p>
                      <p className="text-xs text-emerald-600">Employee updated successfully</p>
                    </div>
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
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Full Name</label>
                      <input 
                        type="text" 
                        value={editForm.name || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 border border-slate-200 text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" 
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Email Address</label>
                      <input 
                        type="email" 
                        value={editForm.email || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3 border border-slate-200 text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Department</label>
                      <select 
                        value={editForm.department || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, department: e.target.value }))}
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white transition-all"
                      >
                        {DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Role</label>
                      <input 
                        type="text" 
                        value={editForm.role || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full px-4 py-3 border border-slate-200 text-gray-900 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all" 
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
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 bg-white transition-all"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="ON_LEAVE">On Leave</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-6 py-3 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="px-6 py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}