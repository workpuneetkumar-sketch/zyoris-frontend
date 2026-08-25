import React, { useState, useEffect } from "react";
import { Connector, DiscoveredEntity, DiscoveredField } from "@/types/integrations";
import { X, Database, Search, Layers, Loader2, FileCode, CheckCircle, AlertCircle } from "lucide-react";

interface SchemaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  connector: Connector | null;
  onFetchSchema: (id: string) => Promise<any>;
}

export function SchemaViewerModal({
  isOpen,
  onClose,
  connector,
  onFetchSchema,
}: SchemaViewerModalProps) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [entities, setEntities] = useState<DiscoveredEntity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedEntityName, setSelectedEntityName] = useState<string>("");

  useEffect(() => {
    if (isOpen && connector?.connectionId) {
      setIsLoading(true);
      setError(null);
      onFetchSchema(connector.connectionId)
        .then((res) => {
          const list = res?.entities || [];
          setEntities(list);
          if (list.length > 0) {
            setSelectedEntityName(list[0].name);
          }
        })
        .catch((err) => {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to discover remote schema entities for this integration."
          );
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, connector, onFetchSchema]);

  if (!isOpen || !connector) return null;

  const currentEntity = entities.find((e) => e.name === selectedEntityName) || entities[0];

  const filteredFields = currentEntity?.fields?.filter((f) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.label?.toLowerCase().includes(q) ||
      f.type.toLowerCase().includes(q)
    );
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-border flex items-center justify-between bg-surface-secondary/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-info/10 border border-info/20 flex items-center justify-center text-info">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text">
                Discovered Schema: {connector.name}
              </h2>
              <p className="text-xs text-text-muted">
                Live entity structure, available fields, and data types from remote API.
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

        {/* Content Body */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-medium text-text-secondary">
                Inspecting remote schema and entities...
              </p>
            </div>
          ) : error ? (
            <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-3">
              <AlertCircle className="w-10 h-10 text-error" />
              <h3 className="text-base font-semibold text-text">
                Schema Discovery Unavailable
              </h3>
              <p className="text-xs text-text-secondary max-w-md">{error}</p>
            </div>
          ) : entities.length === 0 ? (
            <div className="flex-1 p-8 text-center flex flex-col items-center justify-center text-text-muted space-y-2">
              <Layers className="w-10 h-10 opacity-40" />
              <p className="text-sm">No entities discovered for this integration.</p>
            </div>
          ) : (
            <>
              {/* Entities sidebar */}
              <div className="w-full md:w-64 border-r border-border bg-surface-secondary/20 p-4 space-y-2 overflow-y-auto">
                <p className="text-xs font-bold text-text uppercase tracking-wider mb-2">
                  Discovered Entities ({entities.length})
                </p>
                {entities.map((entity) => (
                  <button
                    key={entity.name}
                    onClick={() => setSelectedEntityName(entity.name)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between ${
                      selectedEntityName === entity.name
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-text-secondary hover:text-text hover:bg-surface-hover"
                    }`}
                  >
                    <span className="truncate">{entity.label || entity.name}</span>
                    <span className="text-[10px] opacity-75">
                      {entity.fields?.length || 0} fields
                    </span>
                  </button>
                ))}
              </div>

              {/* Fields Table */}
              <div className="flex-1 flex flex-col overflow-hidden p-5 space-y-4">
                {/* Search Fields */}
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Filter fields..."
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface text-text text-xs border border-border focus:border-primary focus:outline-none"
                    />
                  </div>
                  <span className="text-xs text-text-muted">
                    {filteredFields.length} of {currentEntity?.fields?.length || 0} fields
                  </span>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto border border-border rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-surface-secondary/60 text-text-muted border-b border-border sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3 font-semibold uppercase">Field Name</th>
                        <th className="py-2.5 px-3 font-semibold uppercase">Type</th>
                        <th className="py-2.5 px-3 font-semibold uppercase">Attributes</th>
                        <th className="py-2.5 px-3 font-semibold uppercase">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredFields.map((field, idx) => (
                        <tr key={idx} className="hover:bg-surface-hover transition-colors">
                          <td className="py-2.5 px-3 font-mono font-medium text-text">
                            {field.name}
                            {field.label && (
                              <span className="block text-[10px] font-sans text-text-muted">
                                {field.label}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-primary">
                            {field.type}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex gap-1 flex-wrap">
                              {field.readOnly && (
                                <span className="px-1.5 py-0.5 rounded bg-surface-secondary text-[10px] text-text-muted border border-border">
                                  Read-Only
                                </span>
                              )}
                              {!field.nullable && (
                                <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] border border-primary/20">
                                  Required
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-text-secondary">
                            {field.description || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end bg-surface-secondary/40">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-surface border border-border text-text hover:bg-surface-hover text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
