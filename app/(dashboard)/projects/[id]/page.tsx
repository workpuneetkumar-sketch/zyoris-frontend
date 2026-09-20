"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Project, getProjectById } from "@/lib/api/projectsApi";
import { ProjectWorkspace } from "@/components/projects/workspace/ProjectWorkspace";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ProjectWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || "";

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    async function loadProject() {
      setLoading(true);
      setError(null);
      try {
        const data = await getProjectById(id);
        if (isMounted) setProject(data);
      } catch (err: any) {
        if (isMounted) {
          setError(
            err?.response?.data?.message || err.message || "Failed to load project workspace"
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProject();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-semibold text-slate-500">Loading project workspace...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-center space-y-4 shadow-sm">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">
          Project Not Found
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          {error || "The requested project could not be found or has been deleted."}
        </p>
        <Link
          href="/projects"
          className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl font-semibold text-xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Projects</span>
        </Link>
      </div>
    );
  }

  return <ProjectWorkspace initialProject={project} />;
}
