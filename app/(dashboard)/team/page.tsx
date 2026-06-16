"use client";

import { useState, useEffect, useCallback } from "react";
import { Users, Mail, Briefcase, User, Loader2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { getTeamMembers, TeamMember } from "@/lib/api/organizationsApi";
import { getEmployees, Employee } from "@/lib/api/hrApi";

export default function TeamPage() {
  const router = useRouter();
  const [members, setMembers] = useState<(TeamMember & { employee?: Employee })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch both team members and employees
      const [teamMembersData, employeesData] = await Promise.all([
        getTeamMembers(),
        getEmployees(),
      ]);

      // Match team members to employees by email first, then name
      const enrichedMembers = teamMembersData.map((member) => {
        let matchedEmployee: Employee | undefined;

        // Match by email (primary)
        if (member.email) {
          matchedEmployee = employeesData.find(
            (emp) => emp.email.toLowerCase() === member.email.toLowerCase()
          );
        }

        // If no email match, try by name
        if (!matchedEmployee && member.name) {
          matchedEmployee = employeesData.find(
            (emp) => emp.name.toLowerCase() === member.name.toLowerCase()
          );
        }

        return { ...member, employee: matchedEmployee };
      });

      setMembers(enrichedMembers);
    } catch (err: any) {
      console.error("Error fetching data:", err);
      setError(err.message || "Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group members by role, with Owner first
  const groupedMembers = members.reduce(
    (acc, member) => {
      const role = member.role || "Other";
      if (!acc[role]) {
        acc[role] = [];
      }
      acc[role].push(member);
      return acc;
    },
    {} as Record<string, (TeamMember & { employee?: Employee })[]>
  );

  // Sort roles: Owner first, then alphabetically
  const sortedRoles = Object.keys(groupedMembers).sort((a, b) => {
    if (a.toLowerCase().includes("owner")) return -1;
    if (b.toLowerCase().includes("owner")) return 1;
    return a.localeCompare(b);
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm text-gray-600 font-medium">Loading team...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Team</h3>
          <p className="text-sm text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchData}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all hover:shadow-md font-medium text-sm"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No team members available</h3>
          <p className="text-sm text-gray-600">Get started by adding your first team member</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Team
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {members.length} team member{members.length !== 1 ? "s" : ""} in your organization
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {sortedRoles.map((role) => (
          <div key={role} className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-gray-500" />
              {role}
              <span className="text-sm font-medium text-gray-400">
                ({groupedMembers[role].length})
              </span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedMembers[role].map((member) => (
                <div
                  key={member.id}
                  className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {member.avatar ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="w-12 h-12 rounded-xl object-cover border border-gray-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-blue-600 flex items-center justify-center text-lg font-bold shadow-sm">
                          {member.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-semibold text-gray-900 truncate">
                          {member.name}
                        </h3>
                        <p className="text-sm text-gray-500 truncate flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          {member.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {member.department && (
                      <div className="flex items-center gap-2 text-sm">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">{member.department}</span>
                      </div>
                    )}
                    {member.status && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${member.status.toLowerCase() === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-gray-50 text-gray-700 border-gray-200"
                            }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${member.status.toLowerCase() === "active"
                                ? "bg-emerald-500"
                                : "bg-gray-400"
                              }`}
                          />
                          {member.status}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    {member.employee ? (
                      <button
                        onClick={() => {
                          if (!member.employee) return;
                          router.push(`/hr/employees/${member.employee.id}`);
                        }}
                        className="w-full text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <User className="w-4 h-4" />
                        View Profile
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full text-sm font-medium text-gray-400 cursor-not-allowed py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                      >
                        <User className="w-4 h-4" />
                        Profile unavailable
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
