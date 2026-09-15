
"use client";

import { useState } from "react";
import { X, Send, Calendar, Clock } from "lucide-react";
import { toast } from "react-toastify";
import { createActivity } from "@/lib/api/activitiesApi";

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddActivityModal({ isOpen, onClose, onSuccess }: AddActivityModalProps) {
  const [formData, setFormData] = useState({
    entityType: "COMPANY" as const,
    entityId: "default",
    type: "NOTE" as const,
    message: "",
    priority: "Medium" as const,
    relatedTo: "",
    relatedCompany: "",
    dueDate: "",
    dueTime: "",
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      toast.error("Please enter a message");
      return;
    }
    setLoading(true);
    try {
      // Build metadata with all optional fields as per Swagger example
      const metadata: Record<string, unknown> = {
        priority: formData.priority,
      };
      if (formData.relatedTo) metadata.relatedTo = formData.relatedTo;
      if (formData.relatedCompany) metadata.relatedCompany = formData.relatedCompany;
      if (formData.dueDate) metadata.dueDate = formData.dueDate;
      if (formData.dueTime) metadata.dueTime = formData.dueTime;
      
      await createActivity({
        entityType: formData.entityType,
        entityId: formData.entityId,
        type: formData.type,
        message: formData.message,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });
      toast.success("Activity created successfully!");
      onSuccess();
      onClose();
      setFormData({
        entityType: "COMPANY",
        entityId: "default",
        type: "NOTE",
        message: "",
        priority: "Medium",
        relatedTo: "",
        relatedCompany: "",
        dueDate: "",
        dueTime: "",
      });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to create activity");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add New Activity</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="NOTE">Note</option>
                <option value="TASK">Task</option>
                <option value="CALL">Call</option>
                <option value="MEETING">Meeting</option>
                <option value="EMAIL">Email</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your activity message"
              rows={4}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Related To (optional)</label>
              <input
                type="text"
                value={formData.relatedTo}
                onChange={(e) => setFormData({ ...formData, relatedTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Contact name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Related Company (optional)</label>
              <input
                type="text"
                value={formData.relatedCompany}
                onChange={(e) => setFormData({ ...formData, relatedCompany: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Company name"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Due Date (optional)</label>
              <div className="relative">
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Calendar size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Due Time (optional)</label>
              <div className="relative">
                <input
                  type="time"
                  value={formData.dueTime}
                  onChange={(e) => setFormData({ ...formData, dueTime: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Clock size={16} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send size={16} />}
              {loading ? "Creating..." : "Create Activity"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
