"use client";

import React, { useState } from "react";
import { useIntegrations } from "@/hooks/useIntegrations";
import { useRBAC } from "@/hooks/useRBAC";
import { useAuth } from "@/context/AuthContext";
import { Connector, CreateIntegrationPayload, NormalizedConnectionTestResult, UpdateIntegrationPayload } from "@/types/integrations";
import { AsyncRequestError } from "@/hooks/useAsyncRequest";
import { normalizeConnectionError, normalizeConnectionSuccess } from "@/lib/api/connectionTest";
import { MarketplaceStats } from "@/components/integrations/MarketplaceStats";
import { ConnectorFilters } from "@/components/integrations/ConnectorFilters";
import { ConnectorCard } from "@/components/integrations/ConnectorCard";
import { IntegrationSkeleton } from "@/components/integrations/IntegrationSkeleton";
import { IntegrationWizardModal } from "@/components/integrations/IntegrationWizardModal";
import { SchemaViewerModal } from "@/components/integrations/SchemaViewerModal";
import { DisconnectConfirmationModal } from "@/components/integrations/DisconnectConfirmationModal";
import { EditIntegrationModal } from "@/components/integrations/EditIntegrationModal";
import { RotateCredentialsModal } from "@/components/integrations/RotateCredentialsModal";
import { ReconnectModal } from "@/components/integrations/ReconnectModal";
import { IntegrationMonitoringDashboard } from "@/components/integrations/IntegrationMonitoringDashboard";
import {
  Layers,
  Plus,
  RefreshCw,
  AlertCircle,
  SearchX,
  ShieldAlert,
  FolderPlus,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import {
  RotateCredentialsPayload,
  RotateCredentialsResponse,
  ReconnectPayload,
} from "@/types/integrations";
import classNames from "classnames";

export default function IntegrationsPage() {
  const { user } = useAuth();
  const { hasPermission } = useRBAC();

  // Check management and configuration permissions
  const canManageIntegrations =
    user?.role === "ADMIN" ||
    user?.role === "CEO" ||
    user?.role === "CFO" ||
    user?.role === "OPERATIONS_HEAD" ||
    hasPermission("manage_integrations") ||
    hasPermission("integrations:manage") ||
    hasPermission("admin");

  const canConfigureIntegrations =
    canManageIntegrations ||
    hasPermission("configure") ||
    hasPermission("integrations:configure") ||
    hasPermission("integrations:rotate");

  const {
    connectors,
    integrations,
    filteredConnectors,
    stats,
    isLoading,
    isError,
    error,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedStatus,
    setSelectedStatus,
    refresh,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    reconnectIntegration,
    rotateCredentials,
    triggerSync,
    pauseIntegration,
    resumeIntegration,
    testConnection,
    fetchSchema,
    discoverSchema,
    getSchemaMapping,
    saveSchemaMapping,
    initiateOAuth,
  } = useIntegrations();

  // Modal States
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedConnectorForWizard, setSelectedConnectorForWizard] =
    useState<Connector | null>(null);

  const [isSchemaOpen, setIsSchemaOpen] = useState(false);
  const [selectedConnectorForSchema, setSelectedConnectorForSchema] =
    useState<Connector | null>(null);

  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false);
  const [selectedConnectorForDisconnect, setSelectedConnectorForDisconnect] =
    useState<Connector | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedConnectorForEdit, setSelectedConnectorForEdit] =
    useState<Connector | null>(null);

  const [isRotateOpen, setIsRotateOpen] = useState(false);
  const [selectedConnectorForRotate, setSelectedConnectorForRotate] =
    useState<Connector | null>(null);

  const [isReconnectOpen, setIsReconnectOpen] = useState(false);
  const [selectedConnectorForReconnect, setSelectedConnectorForReconnect] =
    useState<Connector | null>(null);

  // Top Page View Tab (Marketplace vs Production Monitoring)
  const [pageTab, setPageTab] = useState<"CATALOG" | "MONITORING">("CATALOG");

  // Actions Handlers
  const handleOpenConnect = (connector: Connector) => {
    setSelectedConnectorForWizard(connector);
    setIsWizardOpen(true);
  };

  const handleOpenConfigure = (connector: Connector) => {
    setSelectedConnectorForEdit(connector);
    setIsEditOpen(true);
  };

  const handleOpenRotate = (connector: Connector) => {
    setSelectedConnectorForRotate(connector);
    setIsRotateOpen(true);
  };

  const handleOpenReconnectModal = (connector: Connector) => {
    setSelectedConnectorForReconnect(connector);
    setIsReconnectOpen(true);
  };

  const handleViewSchema = (connector: Connector) => {
    setSelectedConnectorForSchema(connector);
    setIsSchemaOpen(true);
  };

  const handleOpenDisconnect = (connector: Connector) => {
    setSelectedConnectorForDisconnect(connector);
    setIsDisconnectOpen(true);
  };

  const handleSyncNow = async (connector: Connector) => {
    const isHubSpot =
      (connector.provider || "").toLowerCase().includes("hubspot") ||
      (connector.id || "").toLowerCase().includes("hubspot") ||
      (connector.name || "").toLowerCase().includes("hubspot");

    const targetId =
      connector.connectionId ||
      connector.connectionState?.id ||
      (isHubSpot ? "hubspot" : connector.id || connector.provider);

    if (!targetId) return;
    try {
      const res = await triggerSync(targetId);
      toast.success(
        res?.message || `Sync triggered successfully for ${connector.name}.`
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          `Failed to sync ${connector.name}.`
      );
    }
  };

  const handleTestConnection = async (connector: Connector): Promise<NormalizedConnectionTestResult> => {
    const targetId =
      connector.connectionId || connector.connectionState?.id || connector.id;
    if (!targetId) {
      throw new AsyncRequestError(normalizeConnectionError(new Error("Missing integration id")), "Missing integration id");
    }
    try {
      const res = await testConnection(targetId);
      const normalized = res.success
        ? normalizeConnectionSuccess(res, res.latencyMs || 0)
        : normalizeConnectionError({
            response: {
              status: res.statusCode && res.statusCode >= 400 ? res.statusCode : undefined,
              data: res,
            },
          });
      if (res?.success) {
        toast.success(
          `Connection verified for ${connector.name}${
            res.latencyMs ? ` (${res.latencyMs}ms)` : ""
          }`
        );
        return normalized;
      }
      throw new AsyncRequestError(normalized, normalized.message || "Connection test failed");
    } catch (err) {
      const normalized = err instanceof AsyncRequestError ? err.data : normalizeConnectionError(err);
      toast.error(normalized.message || `Failed to test connection for ${connector.name}`);
      throw err instanceof AsyncRequestError ? err : new AsyncRequestError(normalized, normalized.message || "Connection test failed");
    }
  };

  const handleTogglePause = async (connector: Connector) => {
    const targetId =
      connector.connectionId || connector.connectionState?.id || connector.id;
    if (!targetId) return;
    const isPaused = (connector.status || "").toUpperCase() === "PAUSED";
    try {
      if (isPaused) {
        await resumeIntegration(targetId);
        toast.success(`Resumed synchronization for ${connector.name}.`);
      } else {
        await pauseIntegration(targetId);
        toast.info(`Paused synchronization for ${connector.name}.`);
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          `Failed to update sync status for ${connector.name}.`
      );
    }
  };

  const handleReconnect = async (connector: Connector) => {
    const targetId =
      connector.connectionId || connector.connectionState?.id || connector.id;
    if (!targetId) return;
    try {
      await reconnectIntegration(targetId);
      toast.success(`Reconnected ${connector.name} successfully.`);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          `Failed to reconnect ${connector.name}.`
      );
    }
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("ALL");
    setSelectedStatus("ALL");
  };

  return (
    <div className="min-h-screen bg-surface p-6 md:p-8 space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text tracking-tight">
              Integration Marketplace
            </h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Live Catalog
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-muted mt-1">
            Connect, synchronize, and configure third-party services and data pipelines for your organization.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refresh()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-surface text-text hover:bg-surface-hover text-xs font-medium transition-colors shadow-sm"
            title="Refresh connectors catalog"
          >
            <RefreshCw className="w-3.5 h-3.5 text-text-muted" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            onClick={() => {
              setSelectedConnectorForWizard(null);
              setIsWizardOpen(true);
            }}
            disabled={!canManageIntegrations}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-dark text-primary-foreground text-xs font-semibold shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Add Integration</span>
          </button>
        </div>
      </div>

      {/* Page Tabs: Catalog vs Audit Logs & Monitoring */}
      <div className="flex items-center gap-2 border-b border-border pb-2">
        <button
          type="button"
          onClick={() => setPageTab("CATALOG")}
          className={classNames(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
            pageTab === "CATALOG"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-text-muted hover:text-text hover:bg-surface-secondary"
          )}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Marketplace Catalog</span>
        </button>

        <button
          type="button"
          onClick={() => setPageTab("MONITORING")}
          className={classNames(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
            pageTab === "MONITORING"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-text-muted hover:text-text hover:bg-surface-secondary"
          )}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Audit Logs & Production Monitoring</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </button>
      </div>

      {/* Render Monitoring Dashboard if tab is selected */}
      {pageTab === "MONITORING" ? (
        <IntegrationMonitoringDashboard
          integrations={integrations}
          onTriggerSync={async (id: string) => {
            await triggerSync(id);
          }}
        />
      ) : (
        <>
          {/* Permission banner for restricted roles */}
          {!canManageIntegrations && (
            <div className="p-3.5 rounded-xl bg-warning/10 border border-warning/20 text-warning text-xs flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <span>
                You have read-only access to the Integration Marketplace. Connector configurations and actions require administrator privileges.
              </span>
            </div>
          )}

      {/* Content Rendering based on State */}
      {isLoading ? (
        <IntegrationSkeleton />
      ) : isError ? (
        <div className="p-10 rounded-2xl border border-error/30 bg-error/5 text-center space-y-4 max-w-xl mx-auto my-8">
          <div className="w-12 h-12 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center text-error mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text">
              Failed to Load Connectors
            </h3>
            <p className="text-xs text-text-secondary mt-1">{error}</p>
          </div>
          <button
            onClick={() => refresh()}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:bg-primary-dark transition-all inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Marketplace Stats */}
          <MarketplaceStats stats={stats} />

          {/* Filters & Search Bar */}
          <div className="p-4 rounded-2xl border border-border bg-surface shadow-sm">
            <ConnectorFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onCategoryChange={setSelectedCategory}
              selectedStatus={selectedStatus}
              onStatusChange={setSelectedStatus}
              totalCount={connectors.length}
              filteredCount={filteredConnectors.length}
              onResetFilters={handleResetFilters}
            />
          </div>

          {/* Connectors Grid / Empty States */}
          {connectors.length === 0 ? (
            <div className="p-12 rounded-2xl border border-border bg-surface text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-secondary border border-border flex items-center justify-center text-text-muted mx-auto">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-text">
                No Connectors Available
              </h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                There are currently no integration connectors available in the catalog.
              </p>
            </div>
          ) : filteredConnectors.length === 0 ? (
            <div className="p-12 rounded-2xl border border-border bg-surface text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-surface-secondary border border-border flex items-center justify-center text-text-muted mx-auto">
                <SearchX className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-text">
                No Matching Connectors Found
              </h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                No connectors match your active search and filter criteria.
              </p>
              <button
                onClick={handleResetFilters}
                className="px-4 py-1.5 rounded-lg border border-border bg-surface hover:bg-surface-hover text-xs font-semibold text-text transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
              {filteredConnectors.map((connector) => (
                <ConnectorCard
                  key={connector.id || connector.provider}
                  connector={connector}
                  onConnect={handleOpenConnect}
                  onConfigure={handleOpenConfigure}
                  onRotateCredentials={handleOpenRotate}
                  onSyncNow={handleSyncNow}
                  onTestConnection={handleTestConnection}
                  onViewSchema={handleViewSchema}
                  onTogglePause={handleTogglePause}
                  onReconnect={handleOpenReconnectModal}
                  onDisconnect={handleOpenDisconnect}
                  canManage={canManageIntegrations}
                />
              ))}
            </div>
          )}
        </div>
      )}
      </>
      )}

      {/* MODALS */}
      {/* Wizard Modal */}
      <IntegrationWizardModal
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setSelectedConnectorForWizard(null);
        }}
        connector={selectedConnectorForWizard}
        availableConnectors={connectors}
        onSubmit={async (payload: CreateIntegrationPayload) => {
          return await createIntegration(payload);
        }}
        onOAuthConnect={async (provider: string, payload?: Record<string, any>) => {
          return await initiateOAuth(provider, payload);
        }}
        onTestConnection={async (id: string, payload?: Record<string, any>) => {
          return await testConnection(id, payload);
        }}
        onUpdateIntegration={async (id: string, payload: UpdateIntegrationPayload) => {
          return await updateIntegration(id, payload);
        }}
        onFetchSchema={async (id: string) => {
          return await fetchSchema(id);
        }}
        onDiscoverSchema={async (id: string, payload?: any) => {
          return await discoverSchema(id, payload);
        }}
        onGetMapping={async (id: string) => {
          return await getSchemaMapping(id);
        }}
        onSaveMapping={async (id: string, payload: any) => {
          return await saveSchemaMapping(id, payload);
        }}
        onViewSchema={(connector: Connector) => {
          handleViewSchema(connector);
        }}
      />

      {/* Edit Integration Modal */}
      <EditIntegrationModal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedConnectorForEdit(null);
        }}
        connector={selectedConnectorForEdit}
        onUpdate={async (id: string, payload: UpdateIntegrationPayload) => {
          await updateIntegration(id, payload);
        }}
        canConfigure={canConfigureIntegrations}
      />

      {/* Rotate Credentials Modal */}
      <RotateCredentialsModal
        isOpen={isRotateOpen}
        onClose={() => {
          setIsRotateOpen(false);
          setSelectedConnectorForRotate(null);
        }}
        connector={selectedConnectorForRotate}
        onRotate={async (id: string, payload: RotateCredentialsPayload) => {
          return await rotateCredentials(id, payload);
        }}
        canConfigure={canConfigureIntegrations}
      />

      {/* Reconnect Modal */}
      <ReconnectModal
        isOpen={isReconnectOpen}
        onClose={() => {
          setIsReconnectOpen(false);
          setSelectedConnectorForReconnect(null);
        }}
        connector={selectedConnectorForReconnect}
        onReconnect={async (id: string, payload?: ReconnectPayload | Record<string, any>) => {
          return await reconnectIntegration(id, payload);
        }}
        canManage={canManageIntegrations}
      />

      {/* Schema Viewer Modal */}
      <SchemaViewerModal
        isOpen={isSchemaOpen}
        onClose={() => {
          setIsSchemaOpen(false);
          setSelectedConnectorForSchema(null);
        }}
        connector={selectedConnectorForSchema}
        onFetchSchema={async (id: string) => {
          return await fetchSchema(id);
        }}
        onDiscoverSchema={async (id: string, payload?: any) => {
          return await discoverSchema(id, payload);
        }}
        onGetMapping={async (id: string) => {
          return await getSchemaMapping(id);
        }}
        onSaveMapping={async (id: string, payload: any) => {
          return await saveSchemaMapping(id, payload);
        }}
      />

      {/* Disconnect Confirmation Modal */}
      <DisconnectConfirmationModal
        isOpen={isDisconnectOpen}
        onClose={() => {
          setIsDisconnectOpen(false);
          setSelectedConnectorForDisconnect(null);
        }}
        connector={selectedConnectorForDisconnect}
        onConfirmDisconnect={async (id: string) => {
          await deleteIntegration(id);
        }}
      />
    </div>
  );
}
