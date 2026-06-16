// app/(dashboard)/projects/components/MilestonesModal.tsx
import React, { useEffect, useState, useCallback } from "react";
import { X, AlertCircle } from "lucide-react";
import { getMilestones, createMilestone, Milestone, CreateMilestonePayload } from "@/lib/api/projectsApi";
import { StatusBadge, Skeleton } from "./SharedComponents";

interface MilestonesModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
  showToast: (type: "success" | "error", message: string) => void;
}

export default function MilestonesModal({
  projectId,
  projectName,
  onClose,
  showToast,
}: MilestonesModalProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const loadMilestones = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMilestones(projectId);
      setMilestones(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadMilestones();
  }, [loadMilestones]);

  const handleCreateMilestone = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload: CreateMilestonePayload = {
      title: formData.get("title") as string,
      description: formData.get("description") as string,
      dueDate: formData.get("dueDate") as string,
      status: (formData.get("status") as string) || "PENDING",
    };

    try {
      const newMilestone = await createMilestone(projectId, payload);
      setMilestones((prev) => [...prev, newMilestone]);
      setShowForm(false);
      showToast("success", "Milestone added");
    } catch (err: any) {
      showToast("error", err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Milestones</h2>
            <p className="text-sm text-gray-500">{projectName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">
              {milestones.length} milestone(s)
            </h3>
            <button
              onClick={() => setShowForm(!showForm)}
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
            >
              {showForm ? "Cancel" : "+ Add Milestone"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreateMilestone} className="mb-6 bg-gray-50 p-4 rounded-xl space-y-3">
              <input
                name="title"
                placeholder="Title"
                required
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <textarea
                name="description"
                placeholder="Description"
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
              <div className="flex gap-3">
                <input
                  type="date"
                  name="dueDate"
                  required
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <select name="status" className="px-3 py-2 border rounded-lg text-sm">
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold"
              >
                Save Milestone
              </button>
            </form>
          )}

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : error ? (
            <div className="text-center text-red-600 py-8">
              <AlertCircle className="w-8 h-8 mx-auto mb-2" />
              {error}
            </div>
          ) : milestones.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm italic">
              No milestones yet.
            </div>
          ) : (
            <div className="relative pl-6 before:absolute before:left-[11px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-gray-200">
              {milestones.map((ms) => (
                <div key={ms.id} className="mb-6 relative">
                  <div
                    className={`absolute left-[-21px] top-1 w-3 h-3 rounded-full border-2 ${
                      ms.status === "COMPLETED"
                        ? "bg-indigo-600 border-indigo-600"
                        : "bg-white border-gray-300"
                    }`}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{ms.title}</h4>
                      <StatusBadge status={ms.status} />
                    </div>
                    {ms.description && (
                      <p className="text-sm text-gray-600 mt-1">{ms.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Due {new Date(ms.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}