import React, { useState } from "react";
import { X } from "lucide-react";
import { Project } from "@/lib/api/projectsApi";
import { useRBAC } from "@/hooks/useRBAC";
import { PermissionGuard } from "@/components/auth/PermissionGuard";

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  initialData?: Project | null;
  loading: boolean;
}

export default function ProjectFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  loading,
}: ProjectFormModalProps) {
  const { hasPermission } = useRBAC();
  const isEdit = Boolean(initialData);
  const canSubmit = isEdit ? hasPermission("projects.update") : hasPermission("projects.create");

  const [form, setForm] = useState({
    name: initialData?.name || "",
    description: initialData?.description || "",
    clientId: initialData?.clientId || "",
    status: initialData?.status || "PLANNING",   // default to PLANNING
    startDate: initialData?.startDate ? initialData.startDate.split("T")[0] : "",
    endDate: initialData?.endDate ? initialData.endDate.split("T")[0] : "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: form.name,
      description: form.description || undefined,
      clientId: form.clientId || undefined,
      status: form.status,
      startDate: form.startDate || undefined,
      endDate: form.endDate || undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {initialData ? "Edit Project" : "Create Project"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project Name *</label>
            <input
              name="name"
              required
              disabled={!canSubmit}
              value={form.name}
              onChange={handleChange}
              className="mt-1 w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              name="description"
              rows={3}
              disabled={!canSubmit}
              value={form.description}
              onChange={handleChange}
              className="mt-1 w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Client ID</label>
              <input
                name="clientId"
                disabled={!canSubmit}
                value={form.clientId}
                onChange={handleChange}
                placeholder="Optional client ID"
                className="mt-1 w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <select
                name="status"
                disabled={!canSubmit}
                value={form.status}
                onChange={handleChange}
                className="mt-1 w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white disabled:bg-gray-100 disabled:text-gray-500"
              >
                <option value="PLANNING">Planning</option>
                <option value="ACTIVE">Active</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                name="startDate"
                disabled={!canSubmit}
                value={form.startDate}
                onChange={handleChange}
                className="mt-1 w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                name="endDate"
                disabled={!canSubmit}
                value={form.endDate}
                onChange={handleChange}
                className="mt-1 w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm disabled:bg-gray-100 disabled:text-gray-500"
              />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200"
            >
              Cancel
            </button>
            <PermissionGuard permission={isEdit ? "projects.update" : "projects.create"}>
              <button
                type="submit"
                disabled={loading || !canSubmit}
                className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50"
              >
                {initialData ? "Update" : "Create"}
              </button>
            </PermissionGuard>
          </div>
        </form>
      </div>
    </div>
  );
}