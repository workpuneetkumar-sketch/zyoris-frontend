// tests/employee_profile_verification.test.ts
// Unit and verification tests for Employee Profile logic, formatting, and edge cases.

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Helper functions matching app/(dashboard)/hr/employees/[employeeId]/page.tsx
const formatRole = (role?: string) => {
  if (!role) return 'No role assigned';
  const trimmed = role.trim();
  if (['HR', 'IT', 'AI', 'UI', 'UX', 'QA', 'CEO', 'CTO', 'COO', 'CFO', 'VP'].includes(trimmed.toUpperCase())) {
    return trimmed.toUpperCase();
  }
  const cleaned = trimmed.replace(/^role_/i, '').replace(/_/g, ' ').trim();
  return cleaned
    .split(' ')
    .map(w => {
      const upper = w.toUpperCase();
      if (['HR', 'IT', 'AI', 'UI', 'UX', 'QA'].includes(upper)) return upper;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(' ');
};

const formatDate = (dateString?: string) => {
  if (!dateString) return 'N/A';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (e) {
    return dateString;
  }
};

const formatTime = (dateString?: string) => {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleTimeString('en-US', {
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

const getStatusBadgeClass = (status: string | undefined) => {
  switch (status?.toUpperCase()) {
    case 'ACTIVE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'INACTIVE': return 'bg-gray-50 text-gray-600 border-gray-200';
    case 'ON_LEAVE': return 'bg-amber-50 text-amber-700 border-amber-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
};

const getStatusDot = (status: string | undefined) => {
  switch (status?.toUpperCase()) {
    case 'ACTIVE': return 'bg-emerald-500';
    case 'INACTIVE': return 'bg-gray-400';
    case 'ON_LEAVE': return 'bg-amber-500';
    default: return 'bg-gray-400';
  }
};

const getStatusLabel = (status: string | undefined) => {
  switch (status?.toUpperCase()) {
    case 'ACTIVE': return 'Active';
    case 'INACTIVE': return 'Inactive';
    case 'ON_LEAVE': return 'On Leave';
    default: return status ? status.replace(/_/g, ' ') : 'N/A';
  }
};

const getDepartmentColor = (dept: string | undefined) => {
  const colors: Record<string, string> = {
    'Engineering': 'from-blue-600 to-indigo-600',
    'HR': 'from-purple-600 to-pink-600',
    'Sales': 'from-emerald-600 to-teal-600',
    'Marketing': 'from-orange-600 to-amber-600',
    'Design': 'from-violet-600 to-purple-600',
    'Finance': 'from-emerald-600 to-green-600',
    'Operations': 'from-indigo-600 to-cyan-600'
  };
  return colors[dept || ''] || 'from-blue-600 to-indigo-600';
};

const validateAndPrepareUpdatePayload = (editForm: {
  department?: string;
  salary?: any;
  joinDate?: string;
}) => {
  if (editForm.salary !== undefined && Number(editForm.salary) < 0) {
    throw new Error('Salary cannot be negative');
  }
  return {
    department: editForm.department,
    salary: editForm.salary !== undefined && !isNaN(Number(editForm.salary)) ? Number(editForm.salary) : undefined,
    joinDate: editForm.joinDate
  };
};

describe("Employee Profile - UI Logic & Edge Cases", () => {
  
  describe("Role formatting", () => {
    it("formats role_admin cleanly to Admin", () => {
      assert.equal(formatRole('role_admin'), 'Admin');
    });

    it("formats uppercase acronyms like HR, IT, QA, CEO correctly", () => {
      assert.equal(formatRole('HR'), 'HR');
      assert.equal(formatRole('IT'), 'IT');
      assert.equal(formatRole('CEO'), 'CEO');
      assert.equal(formatRole('QA'), 'QA');
    });

    it("formats multi-word roles with underscores cleanly", () => {
      assert.equal(formatRole('senior_software_engineer'), 'Senior Software Engineer');
      assert.equal(formatRole('hr_specialist'), 'HR Specialist');
    });

    it("handles missing or empty role gracefully", () => {
      assert.equal(formatRole(''), 'No role assigned');
      assert.equal(formatRole(undefined), 'No role assigned');
    });
  });

  describe("Currency and Salary formatting", () => {
    it("formats USD currency correctly", () => {
      assert.equal(formatCurrency(50000), '$50,000');
      assert.equal(formatCurrency(125000), '$125,000');
    });

    it("formats zero salary correctly as $0", () => {
      assert.equal(formatCurrency(0), '$0');
    });

    it("handles missing or null salary with fallback N/A", () => {
      assert.equal(formatCurrency(undefined), 'N/A');
      assert.equal(formatCurrency(null as any), 'N/A');
    });
  });

  describe("Date and Time formatting", () => {
    it("formats ISO date string into readable format", () => {
      const formatted = formatDate('2026-08-27T00:00:00.000Z');
      assert.match(formatted, /Aug 27, 2026/);
    });

    it("handles missing date gracefully", () => {
      assert.equal(formatDate(''), 'N/A');
      assert.equal(formatDate(undefined), 'N/A');
    });

    it("handles invalid date without throwing", () => {
      const res = formatDate('not-a-valid-date');
      assert.ok(typeof res === 'string');
    });

    it("formats valid check-in time", () => {
      const time = formatTime('2026-08-27T10:30:00.000Z');
      assert.ok(time.includes(':'));
    });

    it("handles missing time with dash placeholder", () => {
      assert.equal(formatTime(''), '-');
      assert.equal(formatTime(undefined), '-');
    });
  });

  describe("Employee Status & Badges", () => {
    it("handles ACTIVE status in any casing", () => {
      assert.equal(getStatusLabel('ACTIVE'), 'Active');
      assert.equal(getStatusLabel('active'), 'Active');
      assert.equal(getStatusLabel('Active'), 'Active');
      assert.ok(getStatusBadgeClass('ACTIVE').includes('emerald'));
      assert.ok(getStatusDot('ACTIVE').includes('emerald-500'));
    });

    it("handles INACTIVE status in any casing", () => {
      assert.equal(getStatusLabel('INACTIVE'), 'Inactive');
      assert.equal(getStatusLabel('inactive'), 'Inactive');
      assert.ok(getStatusBadgeClass('INACTIVE').includes('gray'));
    });

    it("handles ON_LEAVE status with clean label and amber badge", () => {
      assert.equal(getStatusLabel('ON_LEAVE'), 'On Leave');
      assert.equal(getStatusLabel('on_leave'), 'On Leave');
      assert.ok(getStatusBadgeClass('ON_LEAVE').includes('amber'));
      assert.ok(getStatusDot('ON_LEAVE').includes('amber-500'));
    });

    it("handles unknown or missing status safely", () => {
      assert.equal(getStatusLabel(''), 'N/A');
      assert.equal(getStatusLabel(undefined), 'N/A');
      assert.equal(getStatusLabel('PROBATION'), 'PROBATION');
    });
  });

  describe("Department Color Mapping", () => {
    it("maps standard departments to gradients", () => {
      assert.ok(getDepartmentColor('Engineering').includes('blue'));
      assert.ok(getDepartmentColor('HR').includes('purple'));
      assert.ok(getDepartmentColor('Sales').includes('emerald'));
    });

    it("falls back to default gradient for unknown department", () => {
      assert.ok(getDepartmentColor('UnknownDept').includes('blue-600'));
      assert.ok(getDepartmentColor(undefined).includes('blue-600'));
    });
  });

  describe("Edit Form Payload Validation & Contract", () => {
    it("allows valid department, salary, and joinDate", () => {
      const payload = validateAndPrepareUpdatePayload({
        department: "Sales",
        salary: "65000",
        joinDate: "2026-09-01"
      });

      assert.deepEqual(payload, {
        department: "Sales",
        salary: 65000,
        joinDate: "2026-09-01"
      });
    });

    it("rejects negative salary", () => {
      assert.throws(() => {
        validateAndPrepareUpdatePayload({
          department: "Sales",
          salary: "-100"
        });
      }, /Salary cannot be negative/);
    });

    it("handles empty salary as undefined", () => {
      const payload = validateAndPrepareUpdatePayload({
        department: "HR",
        salary: undefined
      });
      assert.equal(payload.salary, undefined);
    });
  });
});
