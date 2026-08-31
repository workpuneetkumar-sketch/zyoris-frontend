import React, { useState, useEffect, useCallback } from "react";
import {
  Connector,
  DiscoveredSchemaResponse,
  FieldMapping,
  SchemaMappingPayload,
} from "@/types/integrations";
import { SchemaExplorer } from "./SchemaExplorer";
import { X, Database, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  getSchemaMappingApi,
  saveSchemaMappingApi,
} from "@/lib/api/integrationsApi";

interface SchemaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  connector: Connector | null;
  onFetchSchema: (id: string) => Promise<any>;
  onDiscoverSchema?: (id: string, payload?: any) => Promise<any>;
  onGetMapping?: (id: string) => Promise<any>;
  onSaveMapping?: (id: string, payload: SchemaMappingPayload) => Promise<any>;
}

export function SchemaViewerModal({
  isOpen,
  onClose,
  connector,
  onFetchSchema,
  onDiscoverSchema,
  onGetMapping,
  onSaveMapping,
}: SchemaViewerModalProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [schemaResponse, setSchemaResponse] = useState<DiscoveredSchemaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [isSavingMapping, setIsSavingMapping] = useState<boolean>(false);

  const targetId = connector?.connectionId || connector?.id;

  const loadSchema = useCallback(() => {
    if (!targetId) return;

    setIsLoading(true);
    setError(null);

    const schemaPromise = onDiscoverSchema
      ? onDiscoverSchema(targetId)
      : onFetchSchema(targetId);

    const mappingPromise = onGetMapping
      ? onGetMapping(targetId)
      : getSchemaMappingApi(targetId).catch(() => ({ mappings: [] }));

    Promise.allSettled([schemaPromise, mappingPromise])
      .then(([schemaRes, mappingRes]) => {
        if (schemaRes.status === "fulfilled") {
          setSchemaResponse(schemaRes.value);
        } else {
          setError(
            schemaRes.reason?.response?.data?.message ||
              schemaRes.reason?.message ||
              "Failed to discover remote schema entities for this integration."
          );
        }

        if (mappingRes.status === "fulfilled") {
          const mapData = mappingRes.value;
          if (Array.isArray(mapData)) {
            setMappings(mapData);
          } else if (Array.isArray(mapData?.mappings)) {
            setMappings(mapData.mappings);
          }
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [targetId, onFetchSchema, onDiscoverSchema, onGetMapping]);

  useEffect(() => {
    if (isOpen && targetId) {
      loadSchema();
    } else if (!isOpen) {
      setSchemaResponse(null);
      setError(null);
      setMappings([]);
    }
  }, [isOpen, targetId, loadSchema]);

  const handleSaveFieldMapping = async (fieldMapping: FieldMapping) => {
    if (!targetId) return;
    setIsSavingMapping(true);
    try {
      // Upsert into local mappings list
      const updatedMappings = [
        ...mappings.filter((m) => m.sourceField !== fieldMapping.sourceField),
        fieldMapping,
      ];

      const payload: SchemaMappingPayload = {
        integrationId: targetId,
        mappings: updatedMappings,
      };

      if (onSaveMapping) {
        await onSaveMapping(targetId, payload);
      } else {
        await saveSchemaMappingApi(targetId, payload);
      }

      setMappings(updatedMappings);
      toast.success(
        `Field '${fieldMapping.sourceField}' mapped to '${fieldMapping.targetField}' successfully.`
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save field mapping."
      );
    } finally {
      setIsSavingMapping(false);
    }
  };

  if (!isOpen || !connector) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col h-[85vh] max-h-[85vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface-secondary/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-text">
                  Schema Discovery: {connector.name}
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Live Explorer
                </span>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Hierarchical field paths, inferred data types, sample values, and pagination metadata.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-text hover:bg-surface-hover transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body with SchemaExplorer */}
        <div className="flex-1 overflow-hidden">
          <SchemaExplorer
            schemaResponse={schemaResponse}
            provider={connector.name}
            isLoading={isLoading}
            error={error}
            onRetry={loadSchema}
            mappings={mappings}
            onSaveMapping={handleSaveFieldMapping}
            isSavingMapping={isSavingMapping}
            className="h-full"
          />
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-border flex items-center justify-between bg-surface-secondary/40 flex-shrink-0">
          <span className="text-xs text-text-muted hidden sm:inline">
            Schema discovery sampled from live provider credentials.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-surface border border-border text-text hover:bg-surface-hover text-xs font-semibold shadow-xs transition-colors ml-auto"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
