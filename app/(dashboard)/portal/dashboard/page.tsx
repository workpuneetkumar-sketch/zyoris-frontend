"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  FolderKanban,
  Receipt,
  FileText,
  Download,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  User,
  RefreshCw,
  Zap,
  Database,
} from "lucide-react";
import {
  getPortalDashboard,
  getPortalProjects,
  getPortalInvoices,
  getPortalDocuments,
  getDemoDashboard,
  getDemoProjects,
  getDemoInvoices,
  getDemoDocuments,
  PortalDashboardData,
  PortalProject,
  PortalInvoice,
  PortalDocument,
} from "@/lib/api/portalApi";

/* ── Helpers ────────────────────────────────────────────────────────── */
const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, string> = {
    ACTIVE: "bg-emerald-100 text-emerald-700",
    COMPLETED: "bg-blue-100 text-blue-700",
    PENDING: "bg-amber-100 text-amber-700",
    PAID: "bg-emerald-100 text-emerald-700",
    OVERDUE: "bg-red-100 text-red-700",
    SENT: "bg-indigo-100 text-indigo-700",
    DRAFT: "bg-gray-100 text-gray-600",
    CANCELLED: "bg-gray-100 text-gray-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        colorMap[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
};

const Skeleton = ({ className }: { className?: string }) => (
  <div className={`animate-pulse bg-gray-200 rounded ${className}`} />
);

/* ── Main Dashboard Component ───────────────────────────────────────── */
export default function PortalDashboardPage() {
  const [demoMode, setDemoMode] = useState(true); // start with demo data
  const [dashboardData, setDashboardData] = useState<PortalDashboardData | null>(null);
  const [projects, setProjects] = useState<PortalProject[]>([]);
  const [invoices, setInvoices] = useState<PortalInvoice[]>([]);
  const [documents, setDocuments] = useState<PortalDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDemoData = useCallback(() => {
    setDashboardData(getDemoDashboard());
    setProjects(getDemoProjects());
    setInvoices(getDemoInvoices());
    setDocuments(getDemoDocuments());
  }, []);

  const loadRealData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, proj, inv, docs] = await Promise.all([
        getPortalDashboard(),
        getPortalProjects(),
        getPortalInvoices(),
        getPortalDocuments(),
      ]);
      setDashboardData(dash);
      setProjects(proj);
      setInvoices(inv);
      setDocuments(docs);
    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (demoMode) {
      loadDemoData();
    } else {
      loadRealData();
    }
  }, [demoMode, loadDemoData, loadRealData]);

  const toggleMode = () => {
    setDemoMode(!demoMode);
  };

  // Safeguards
  const projectsCount = dashboardData?.projectsCount ?? projects.length;
  const invoicesCount = dashboardData?.invoicesCount ?? invoices.length;
  const documentsCount = dashboardData?.documentsCount ?? documents.length;

  return (
    <div className="space-y-8">
      {/* Welcome Banner + Toggle */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-2xl p-6 sm:p-8 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Welcome back!</h1>
              <p className="text-indigo-200 mt-1">
                Here’s a quick overview of your projects, invoices, and documents.
              </p>
            </div>
          </div>
          <button
            onClick={toggleMode}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl text-sm font-medium transition-colors"
          >
            {demoMode ? (
              <>
                <Database size={18} /> Switch to Live Data
              </>
            ) : (
              <>
                <Zap size={18} /> View Demo Data
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {loading && !demoMode ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle size={20} />
          {error}
          <button onClick={loadRealData} className="ml-auto text-sm font-medium underline">
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={<FolderKanban className="w-6 h-6 text-indigo-600" />}
            label="Projects"
            value={projectsCount}
            color="bg-indigo-50"
          />
          <StatCard
            icon={<Receipt className="w-6 h-6 text-emerald-600" />}
            label="Invoices"
            value={invoicesCount}
            color="bg-emerald-50"
          />
          <StatCard
            icon={<FileText className="w-6 h-6 text-amber-600" />}
            label="Documents"
            value={documentsCount}
            color="bg-amber-50"
          />
        </div>
      )}

      {/* Data Sections (always visible, full lists) */}
      {loading && !demoMode ? (
        <div className="space-y-8">
          <SectionSkeleton />
          <SectionSkeleton />
          <SectionSkeleton />
        </div>
      ) : error ? null : (
        <div className="space-y-8">
          {/* Projects Section */}
          <Section
            title="Your Projects"
            icon={<FolderKanban className="w-5 h-5 text-indigo-500" />}
            count={projects.length}
          >
            {projects.length === 0 ? (
              <EmptyMessage>No projects assigned to you yet.</EmptyMessage>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {projects.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            )}
          </Section>

          {/* Invoices Section */}
          <Section
            title="Your Invoices"
            icon={<Receipt className="w-5 h-5 text-emerald-500" />}
            count={invoices.length}
          >
            {invoices.length === 0 ? (
              <EmptyMessage>No invoices available.</EmptyMessage>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv) => (
                  <InvoiceRow key={inv.id} invoice={inv} />
                ))}
              </div>
            )}
          </Section>

          {/* Documents Section */}
          <Section
            title="Your Documents"
            icon={<FileText className="w-5 h-5 text-amber-500" />}
            count={documents.length}
          >
            {documents.length === 0 ? (
              <EmptyMessage>No documents shared yet.</EmptyMessage>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <DocumentRow key={doc.id} document={doc} />
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  );
}

/* ── Smaller Components ──────────────────────────────────────────────── */

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          {icon}
          {title}
        </h3>
        <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </div>
      {children}
    </div>
  );
}

function EmptyMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-center py-8 text-sm text-gray-500 italic">{children}</div>
  );
}

function SectionSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-3">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}

/* ── Project Card ───────────────────────────────────────────────────── */
function ProjectCard({ project }: { project: PortalProject }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{project.name}</p>
        <StatusBadge status={project.status} />
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
        <Calendar size={12} />
        {formatDate(project.startDate)}
        {project.endDate && (
          <>
            <span>–</span>
            {formatDate(project.endDate)}
          </>
        )}
      </div>
      {project.progress != null && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-indigo-600 h-1.5 rounded-full"
              style={{ width: `${project.progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{project.progress}%</span>
        </div>
      )}
    </div>
  );
}

/* ── Invoice Row ─────────────────────────────────────────────────────── */
function InvoiceRow({ invoice }: { invoice: PortalInvoice }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
      <div>
        <p className="text-sm font-medium text-gray-900">{invoice.number}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
          <StatusBadge status={invoice.status} />
          <span className="flex items-center gap-1">
            <Clock size={12} /> Due {formatDate(invoice.dueDate)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm font-semibold text-gray-800">
          ${invoice.amount.toFixed(2)}
        </span>
        {invoice.downloadUrl && (
          <a
            href={invoice.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
            title="Download"
          >
            <Download size={16} />
          </a>
        )}
      </div>
    </div>
  );
}

/* ── Document Row ────────────────────────────────────────────────────── */
function DocumentRow({ document }: { document: PortalDocument }) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{document.fileName}</p>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
          <span>{document.fileType}</span>
          <span>•</span>
          <span>{formatBytes(document.fileSize)}</span>
          <span>•</span>
          <span>{formatDate(document.uploadDate)}</span>
        </div>
      </div>
      {document.downloadUrl && (
        <a
          href={document.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"
          title="Download"
        >
          <Download size={16} />
        </a>
      )}
    </div>
  );
}