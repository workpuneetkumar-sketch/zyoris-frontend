"use client";

import { useState } from "react";
import { X, Calendar, Clock, AlertCircle, User, Building2, CheckCircle2 } from "lucide-react";
import { CreateActivityRequest, createActivity } from "@/lib/api/activitiesApi";
import { toast } from "react-toastify";

interface AddActivityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type ActivityType = "TASK" | "CALL" | "MEETING" | "EMAIL" | "NOTE";
type Priority = "High" | "Medium" | "Low";
type EntityType = "LEAD" | "DEAL" | "CONTACT" | "COMPANY";

const activityTypes: { value: ActivityType; label: string; color: string }[] = [
  { value: "TASK", label: "Task", color: "bg-blue-50 text-blue-600 border-blue-200" },
  { value: "CALL", label: "Call", color: "bg-green-50 text-green-600 border-green-200" },
  { value: "MEETING", label: "Meeting", color: "bg-purple-50 text-purple-600 border-purple-200" },
  { value: "EMAIL", label: "Email", color: "bg-amber-50 text-amber-600 border-amber-200" },
  { value: "NOTE", label: "Note", color: "bg-gray-50 text-gray-600 border-gray-200" },
];

const priorities: { value: Priority; label: string; color: string }[] = [
  { value: "High", label: "High", color: "bg-red-50 text-red-600 border-red-200" },
  { value: "Medium", label: "Medium", color: "bg-amber-50 text-amber-600 border-amber-200" },
  { value: "Low", label: "Low", color: "bg-green-50 text-green-600 border-green-200" },
];

const entityTypes: { value: EntityType; label: string }[] = [
  { value: "LEAD", label: "Lead" },
  { value: "CONTACT", label: "Contact" },
  { value: "COMPANY", label: "Company" },
  { value: "DEAL", label: "Deal" },
];

export function AddActivityModal({ isOpen, onClose, onSuccess }: AddActivityModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "TASK" as ActivityType,
    title: "",
    message: "",
    entityType: "LEAD" as EntityType,
    entityId: "",
    relatedTo: "",
    relatedCompany: "",
    dueDate: new Date().toISOString().split("T")[0],
    dueTime: "09:00",
    priority: "Medium" as Priority,
  });

  const resetForm = () => {
    setFormData({
      type: "TASK",
      title: "",
      message: "",
      entityType: "LEAD",
      entityId: "",
      relatedTo: "",
      relatedCompany: "",
      dueDate: new Date().toISOString().split("T")[0],
      dueTime: "09:00",
      priority: "Medium",
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const request: CreateActivityRequest = {
        type: formData.type,
        title: formData.title,
        message: formData.message,
        entityType: formData.entityType,
        entityId: formData.entityId || "default",
        dueDate: formData.dueDate,
        priority: formData.priority,
        metadata: {
          relatedTo: formData.relatedTo,
          relatedCompany: formData.relatedCompany,
          dueTime: formData.dueTime,
        },
      };

      await createActivity(request);
      toast.success("Activity created successfully!");
      handleClose();
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to create activity");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Add Activity</h2>
            <p className="text-sm text-gray-500 mt-1">Create a new activity or task</p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Activity Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Activity Type
            </label>
            <div className="grid grid-cols-5 gap-2">
              {activityTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: type.value }))}
                  className={`p-3 rounded-xl border-2 text-center transition-all ${
                    formData.type === type.value
                      ? `${type.color} border-current`
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
                >
                  <span className="text-xs font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter activity title"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Enter activity description"
              rows={4}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
            />
          </div>

          {/* Related To */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Related Entity Type
              </label>
              <select
                value={formData.entityType}
                onChange={(e) => setFormData(prev => ({ ...prev, entityType: e.target.value as EntityType }))}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              >
                {entityTypes.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Related To
              </label>
              <div className="relative">
                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={formData.relatedTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, relatedTo: e.target.value }))}
                  placeholder="Contact name"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Company
            </label>
            <div className="relative">
              <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={formData.relatedCompany}
                onChange={(e) => setFormData(prev => ({ ...prev, relatedCompany: e.target.value }))}
                placeholder="Company name"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* Due Date & Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <div className="relative">
                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Time
              </label>
              <div className="relative">
                <Clock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="time"
                  value={formData.dueTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueTime: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-3">
              {priorities.map((prio) => (
                <button
                  key={prio.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, priority: prio.value }))}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    formData.priority === prio.value
                      ? `${prio.color} border-current`
                      : "border-gray-200 hover:border-gray-300 text-gray-600"
                  }`}
                >
                  {prio.value === "High" && <AlertCircle size={16} />}
                  {prio.value === "Medium" && <Clock size={16} />}
                  {prio.value === "Low" && <CheckCircle2 size={16} />}
                  <span className="text-sm font-medium">{prio.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 size={18} />
              )}
              Create Activity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
