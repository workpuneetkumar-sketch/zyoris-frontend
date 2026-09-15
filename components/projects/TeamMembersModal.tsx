"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Search, UserPlus, Trash2, ShieldCheck, AlertCircle } from "lucide-react";
import {
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
  getEmployees,
  getProjectById,
  ProjectMember,
} from "@/lib/api/projectsApi";

interface TeamModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  showToast: (type: "success" | "error", message: string) => void;
  onMemberAdded: (member: { id: string; name: string; email: string }) => void;
}

interface MemberDisplay {
  id: string;         // userId
  memberId?: string;  // membership ID
  name: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
}

export default function TeamMembersModal({
  projectId,
  projectName,
  onClose,
  showToast,
  onMemberAdded,
}: TeamModalProps) {
  const [currentMembers, setCurrentMembers] = useState<MemberDisplay[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<"OWNER" | "ADMIN" | "MEMBER" | "VIEWER">("MEMBER");
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);
  const [employeeMap, setEmployeeMap] = useState<Record<string, { name: string; email: string }>>({});
  const [permissionError, setPermissionError] = useState<string | null>(null);

  // Load employees & build map
  const loadEmployees = useCallback(async () => {
    try {
      const emps = await getEmployees();
      setEmployees(emps);
      const map: Record<string, { name: string; email: string }> = {};
      emps.forEach((emp: any) => {
        if (emp.user) {
          map[emp.userId] = { name: emp.user.name, email: emp.user.email };
        }
      });
      setEmployeeMap(map);
    } catch {
      showToast("error", "Failed to load employees");
    } finally {
      setLoadingEmployees(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // Fetch project members from GET /projects/{id}
  const loadMembers = useCallback(async () => {
    try {
      const project = await getProjectById(projectId);
      const members: ProjectMember[] = project.members || [];
      const enriched: MemberDisplay[] = members.map((m) => ({
        id: m.userId,
        memberId: m.id,
        name: employeeMap[m.userId]?.name || "Loading...",
        email: employeeMap[m.userId]?.email || "",
        role: m.role || "MEMBER",
      }));
      setCurrentMembers(enriched);
    } catch {
      showToast("error", "Failed to load project members");
    } finally {
      setLoadingMembers(false);
    }
  }, [projectId, employeeMap, showToast]);

  useEffect(() => {
    if (Object.keys(employeeMap).length > 0) {
      loadMembers();
    }
  }, [employeeMap, loadMembers]);

  const availableEmployees = employees.filter(
    (emp) => !currentMembers.some((m) => m.id === emp.userId)
  );

  const filteredEmployees = search
    ? availableEmployees.filter(
        (emp) =>
          emp.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
          emp.user?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : availableEmployees;

  const handleAdd = async (userId: string) => {
    setAdding(userId);
    setPermissionError(null);
    try {
      const res = await addProjectMember(projectId, { userId, role: selectedRole });
      const emp = employees.find((e) => e.userId === userId);
      const newMember: MemberDisplay = {
        id: userId,
        memberId: res?.id,
        name: emp?.user?.name || "Unknown",
        email: emp?.user?.email || "",
        role: selectedRole,
      };
      setCurrentMembers((prev) => [...prev, newMember]);
      onMemberAdded(newMember);
      showToast("success", `Member added as ${selectedRole}`);
    } catch (err: any) {
      const msg = err.message || "Failed to add member";
      setPermissionError(msg);
      showToast("error", msg);
    } finally {
      setAdding(null);
    }
  };

  const handleUpdateRole = async (member: MemberDisplay, newRole: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER") => {
    if (!member.memberId) return;
    setUpdatingMemberId(member.id);
    setPermissionError(null);
    try {
      await updateProjectMember(projectId, member.memberId, newRole);
      setCurrentMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, role: newRole } : m))
      );
      showToast("success", `Role updated to ${newRole}`);
    } catch (err: any) {
      const msg = err.message || "Failed to update member role";
      setPermissionError(msg);
      showToast("error", msg);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  const handleRemoveMember = async (member: MemberDisplay) => {
    if (!member.memberId) return;
    setUpdatingMemberId(member.id);
    setPermissionError(null);
    try {
      await removeProjectMember(projectId, member.memberId);
      setCurrentMembers((prev) => prev.filter((m) => m.id !== member.id));
      showToast("success", "Member removed from project");
    } catch (err: any) {
      const msg = err.message || "Failed to remove member";
      setPermissionError(msg);
      showToast("error", msg);
    } finally {
      setUpdatingMemberId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl shadow-xl max-h-[85vh] overflow-y-auto border border-gray-100 dark:border-slate-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Team Members & Permissions</h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">{projectName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl text-gray-500 dark:text-slate-400">
            <X size={20} />
          </button>
        </div>

        {permissionError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle size={16} className="shrink-0" />
            <span>{permissionError}</span>
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Current members */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-indigo-600 dark:text-indigo-400" />
              <span>Current Members ({currentMembers.length})</span>
            </h3>
            {loadingMembers ? (
              <p className="text-sm text-gray-400 italic">Loading members...</p>
            ) : currentMembers.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No members yet.</p>
            ) : (
              <div className="space-y-2">
                {currentMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl text-sm border border-gray-100 dark:border-slate-700/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        disabled={updatingMemberId === member.id || !member.memberId}
                        onChange={(e) =>
                          handleUpdateRole(
                            member,
                            e.target.value as "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
                          )
                        }
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      >
                        <option value="OWNER">OWNER</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="MEMBER">MEMBER</option>
                        <option value="VIEWER">VIEWER</option>
                      </select>

                      {member.memberId && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(member)}
                          disabled={updatingMemberId === member.id}
                          title="Remove member"
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add members */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-slate-300">Add Members</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-slate-400">Role:</span>
                <select
                  value={selectedRole}
                  onChange={(e) =>
                    setSelectedRole(
                      e.target.value as "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"
                    )
                  }
                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200"
                >
                  <option value="OWNER">OWNER</option>
                  <option value="ADMIN">ADMIN</option>
                  <option value="MEMBER">MEMBER</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-900 dark:text-white rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {loadingEmployees ? (
              <p className="text-sm text-gray-400 italic">Loading employees...</p>
            ) : filteredEmployees.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                {search ? "No matching employees found." : "All employees are already members."}
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {filteredEmployees.map((emp) => (
                  <div
                    key={emp.userId}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg transition"
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center font-semibold text-gray-700 dark:text-slate-200">
                        {emp.user?.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{emp.user?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-slate-400">{emp.user?.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAdd(emp.userId)}
                      disabled={adding === emp.userId}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition"
                    >
                      <UserPlus size={14} />
                      {adding === emp.userId ? "Adding..." : "Add"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}