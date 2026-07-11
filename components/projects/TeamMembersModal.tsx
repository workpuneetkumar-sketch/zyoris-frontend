"use client";

import React, { useState, useEffect, useCallback } from "react";
import { X, Search, UserPlus } from "lucide-react";
import {
  addProjectMember,
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
  name: string;
  email: string;
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
  const [employeeMap, setEmployeeMap] = useState<Record<string, { name: string; email: string }>>({});

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
    } catch (err) {
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
        name: employeeMap[m.userId]?.name || "Loading...",
        email: employeeMap[m.userId]?.email || "",
      }));
      setCurrentMembers(enriched);
    } catch (err) {
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
    try {
      await addProjectMember(projectId, { userId });
      const emp = employees.find((e) => e.userId === userId);
      const newMember: MemberDisplay = {
        id: userId,
        name: emp?.user?.name || "Unknown",
        email: emp?.user?.email || "",
      };
      setCurrentMembers((prev) => [...prev, newMember]);
      onMemberAdded(newMember);
      showToast("success", "Member added successfully");
    } catch (err: any) {
      showToast("error", err.message || "Failed to add member");
    } finally {
      setAdding(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Team Members</h2>
            <p className="text-sm text-gray-500">{projectName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current members */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Current Members ({currentMembers.length})
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
                    className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-sm"
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center font-semibold text-indigo-700">
                      {member.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add members */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Members</h3>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search employees..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
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
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-700">
                        {emp.user?.name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{emp.user?.name}</p>
                        <p className="text-xs text-gray-500">{emp.user?.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAdd(emp.userId)}
                      disabled={adding === emp.userId}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50"
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