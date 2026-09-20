"use client";

import React, { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  X,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Database,
  Layers,
  FileText,
  Hash,
  Calendar,
  CheckSquare,
  Tag,
  Link as LinkIcon,
  HelpCircle,
  Eye,
  Check,
} from "lucide-react";
import {
  WorkspaceDatabase,
  DatabasePropertyType,
} from "@/types/workspace";
import {
  previewDatabaseImport,
  commitDatabaseImport,
} from "@/lib/api/workspaceApi";

interface DatabaseImportWizardModalProps {
  database: WorkspaceDatabase;
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess?: () => void;
}

export type ImportStep =
  | "upload"
  | "detected"
  | "mapping"
  | "preview"
  | "validation"
  | "import"
  | "result";

export interface ColumnMappingItem {
  sourceColumn: string;
  targetName: string;
  inferredType: DatabasePropertyType;
  selectedType: DatabasePropertyType;
  included: boolean;
  sampleValues: any[];
}

export interface RowValidationIssue {
  rowIndex: number;
  column: string;
  value: any;
  message: string;
  severity: "error" | "warning";
}

const STEP_DEFINITIONS: { id: ImportStep; title: string; subtitle: string }[] = [
  { id: "upload", title: "Upload", subtitle: "CSV or XLSX" },
  { id: "detected", title: "Detected Type", subtitle: "BE-1 Inference" },
  { id: "mapping", title: "Mapping", subtitle: "Schema columns" },
  { id: "preview", title: "Preview", subtitle: "20–50 Rows" },
  { id: "validation", title: "Validation", subtitle: "Data quality" },
  { id: "import", title: "Import", subtitle: "Transactional" },
  { id: "result", title: "Result", subtitle: "Confirmation" },
];

export const DatabaseImportWizardModal: React.FC<DatabaseImportWizardModalProps> = ({
  database,
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState<ImportStep>("upload");

  // File & Raw Data State
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState("");
  const [fileSizeStr, setFileSizeStr] = useState("");
  const [parsedRows, setParsedRows] = useState<Record<string, any>[]>([]);
  const [isParsingFile, setIsParsingFile] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Inferred & Column Mapping State
  const [inferredSchema, setInferredSchema] = useState<Record<string, string>>({});
  const [columnMappings, setColumnMappings] = useState<ColumnMappingItem[]>([]);
  const [isInferenceLoading, setIsInferenceLoading] = useState(false);

  // Preview Search & Pagination
  const [previewSearch, setPreviewSearch] = useState("");
  const [previewPage, setPreviewPage] = useState(1);
  const PREVIEW_PAGE_SIZE = 25;

  // Validation State
  const [validationIssues, setValidationIssues] = useState<RowValidationIssue[]>([]);
  const [skipInvalidRows, setSkipInvalidRows] = useState(false);

  // Commit / Import State
  const [isImporting, setIsImporting] = useState(false);
  const [importProgressText, setImportProgressText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<{
    rowsInserted: number;
    columnsCount: number;
    elapsedMs: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active mappings memoized for preview and validation (Unconditional hook call at top level)
  const activeMappings = useMemo(
    () => columnMappings.filter((m) => m.included),
    [columnMappings]
  );

  // ── Step 1: File Parsing ──────────────────────────────────────────────────
  const handleFileUpload = async (uploadedFile: File) => {
    setParseError(null);
    setIsParsingFile(true);
    setFile(uploadedFile);
    setFileName(uploadedFile.name);
    setFileSizeStr((uploadedFile.size / 1024).toFixed(1) + " KB");

    try {
      const dataBuffer = await uploadedFile.arrayBuffer();
      const workbook = XLSX.read(dataBuffer, { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        throw new Error("No sheets found in the uploaded workbook");
      }
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, {
        raw: true,
        defval: "",
      });

      if (!jsonRows || jsonRows.length === 0) {
        throw new Error("The uploaded file does not contain any data rows.");
      }

      setParsedRows(jsonRows);
      setIsParsingFile(false);

      // Auto-trigger type detection transition
      await runSchemaInference(jsonRows, uploadedFile.name);
    } catch (err: any) {
      console.error("Failed to parse spreadsheet:", err);
      setParseError(err.message || "Failed to parse file. Please upload a valid CSV or XLSX.");
      setIsParsingFile(false);
    }
  };

  const handleSampleTemplate = async () => {
    const sampleCsv = `Task Name,Owner,Priority,Due Date,Estimate (hrs),Completed
Design Landing Page,Alex Rivera,High,2026-10-01,16,true
Implement Database Import Engine,Moulika Sanyal,High,2026-10-05,24,false
Setup Kanban Board Views,Puneet Kumar,Medium,2026-10-10,12,false
Write Automated Integration Tests,Dev Team,Medium,2026-10-12,8,false
Deploy Production Release,DevOps Lead,Low,2026-10-20,4,false`;

    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8;" });
    const sampleFile = new File([blob], "sample_projects_import.csv", { type: "text/csv" });
    await handleFileUpload(sampleFile);
  };

  // ── Step 2: Schema Inference (BE-1 API Alignment) ──────────────────────────
  const runSchemaInference = async (rows: Record<string, any>[], name: string) => {
    setIsInferenceLoading(true);
    const sampleSlice = rows.slice(0, 10);

    let detected: Record<string, string> = {};
    try {
      if (database?.id) {
        const res = await previewDatabaseImport(database.id, sampleSlice);
        if (res && typeof res === "object") {
          detected = res;
        }
      }
    } catch (err) {
      console.warn("Backend preview API unavailable or unauthorized, applying client type detection:", err);
    }

    // Client-side fallback / refinement if backend returned empty or errored
    const headers = Object.keys(rows[0] || {});
    const initialMappings: ColumnMappingItem[] = headers.map((header) => {
      let inferred: DatabasePropertyType = "TEXT";
      if (detected[header]) {
        inferred = detected[header].toUpperCase() as DatabasePropertyType;
      } else {
        inferred = guessColumnType(rows, header);
      }

      const sampleValues = rows
        .slice(0, 4)
        .map((r) => r[header])
        .filter((v) => v !== undefined && v !== "");

      return {
        sourceColumn: header,
        targetName: header,
        inferredType: inferred,
        selectedType: inferred,
        included: true,
        sampleValues,
      };
    });

    setInferredSchema(detected);
    setColumnMappings(initialMappings);
    setIsInferenceLoading(false);
    setCurrentStep("detected");
  };

  // Client-side detection heuristic
  const guessColumnType = (rows: Record<string, any>[], column: string): DatabasePropertyType => {
    const values = rows
      .slice(0, 20)
      .map((r) => r[column])
      .filter((v) => v !== undefined && v !== "");

    if (values.length === 0) return "TEXT";

    const allBoolean = values.every((v) => typeof v === "boolean" || v === "true" || v === "false");
    if (allBoolean) return "CHECKBOX";

    const allNumeric = values.every((v) => !isNaN(Number(v)));
    if (allNumeric) return "NUMBER";

    const allDates = values.every((v) => {
      if (v instanceof Date) return true;
      const parsed = Date.parse(String(v));
      return !isNaN(parsed) && String(v).length >= 6;
    });
    if (allDates) return "DATE";

    const uniqueSet = new Set(values.map((v) => String(v).trim()));
    if (uniqueSet.size <= 5 && values.length >= 8) return "SELECT";

    return "TEXT";
  };

  // ── Step 3: Column Mapping Updates ─────────────────────────────────────────
  const handleMappingChange = (
    index: number,
    field: keyof ColumnMappingItem,
    value: any
  ) => {
    setColumnMappings((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleResetMapping = () => {
    setColumnMappings((prev) =>
      prev.map((item) => ({
        ...item,
        targetName: item.sourceColumn,
        selectedType: item.inferredType,
        included: true,
      }))
    );
  };

  // ── Step 4 & 5: Preview & Validation Scanner ───────────────────────────────
  const runValidationScan = () => {
    const issues: RowValidationIssue[] = [];

    parsedRows.forEach((row, rowIndex) => {
      activeMappings.forEach((mapping) => {
        const val = row[mapping.sourceColumn];

        if (mapping.selectedType === "NUMBER" && val !== "" && val !== null && val !== undefined) {
          if (isNaN(Number(val))) {
            issues.push({
              rowIndex: rowIndex + 1,
              column: mapping.targetName,
              value: val,
              message: `Expected a number, but found '${val}'`,
              severity: "warning",
            });
          }
        }

        if (mapping.selectedType === "DATE" && val !== "" && val !== null && val !== undefined) {
          if (!(val instanceof Date) && isNaN(Date.parse(String(val)))) {
            issues.push({
              rowIndex: rowIndex + 1,
              column: mapping.targetName,
              value: val,
              message: `Invalid date format '${val}'`,
              severity: "warning",
            });
          }
        }

        // Primary Name Column Check
        if (
          (mapping.targetName.toLowerCase() === "name" ||
            mapping.targetName.toLowerCase() === "title") &&
          (val === "" || val === null || val === undefined)
        ) {
          issues.push({
            rowIndex: rowIndex + 1,
            column: mapping.targetName,
            value: "(empty)",
            message: "Primary Name/Title is empty for this row",
            severity: "error",
          });
        }
      });
    });

    setValidationIssues(issues);
    setCurrentStep("validation");
  };

  // ── Step 6: Commit Transaction ────────────────────────────────────────────
  const handleExecuteImport = async () => {
    if (!database?.id) return;
    setIsImporting(true);
    setImportError(null);
    const startTime = Date.now();

    try {
      setImportProgressText("Constructing mapped schema & sanitized records...");

      // Build target schema object: { [targetName]: "TEXT" | "NUMBER" | "DATE" | ... }
      const finalSchema: Record<string, string> = {};
      activeMappings.forEach((m) => {
        finalSchema[m.targetName.trim()] = m.selectedType.toUpperCase();
      });

      // Transform rows based on mapped column names and types
      const sanitizedRows = parsedRows.map((row, idx) => {
        const rowData: Record<string, any> = {};
        activeMappings.forEach((m) => {
          let val = row[m.sourceColumn];

          if (m.selectedType === "NUMBER") {
            val = val === "" || val === null || val === undefined ? null : Number(val);
          } else if (m.selectedType === "CHECKBOX") {
            val = val === true || val === "true" || val === 1 || val === "1";
          } else if (m.selectedType === "DATE") {
            if (val instanceof Date) {
              val = val.toISOString().split("T")[0];
            } else if (val) {
              try {
                val = new Date(val).toISOString().split("T")[0];
              } catch (e) {}
            }
          }

          rowData[m.targetName.trim()] = val;
        });

        // Ensure primary key has fallback if empty
        if (!rowData.Name && !rowData.Title) {
          rowData.Name = `Imported Record ${idx + 1}`;
        }

        return rowData;
      });

      setImportProgressText("Transacting with Zyoris BE-1 Bulk Insert Engine...");
      const result = await commitDatabaseImport(database.id, finalSchema, sanitizedRows);

      const elapsed = Date.now() - startTime;
      setImportResult({
        rowsInserted: result?.rowsInserted || sanitizedRows.length,
        columnsCount: Object.keys(finalSchema).length,
        elapsedMs: elapsed,
      });

      setCurrentStep("result");
      if (onImportSuccess) {
        onImportSuccess();
      }
    } catch (err: any) {
      console.error("Import commit failed:", err);
      setImportError(
        err?.response?.data?.message ||
          err.message ||
          "Failed to execute database import. Please check validation requirements."
      );
    } finally {
      setIsImporting(false);
    }
  };

  // Type rendering badge helper
  const renderTypeBadge = (type: DatabasePropertyType) => {
    const t = (type || "TEXT").toUpperCase();
    switch (t) {
      case "NUMBER":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200 dark:border-emerald-800">
            <Hash className="w-3 h-3" /> Number
          </span>
        );
      case "DATE":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-50 dark:bg-amber-950/50 text-amber-600 border border-amber-200 dark:border-amber-800">
            <Calendar className="w-3 h-3" /> Date
          </span>
        );
      case "SELECT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 dark:bg-purple-950/50 text-purple-600 border border-purple-200 dark:border-purple-800">
            <Tag className="w-3 h-3" /> Select
          </span>
        );
      case "CHECKBOX":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-pink-50 dark:bg-pink-950/50 text-pink-600 border border-pink-200 dark:border-pink-800">
            <CheckSquare className="w-3 h-3" /> Checkbox
          </span>
        );
      case "URL":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 border border-cyan-200 dark:border-cyan-800">
            <LinkIcon className="w-3 h-3" /> URL
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 dark:bg-blue-950/50 text-blue-600 border border-blue-200 dark:border-blue-800">
            <FileText className="w-3 h-3" /> Text
          </span>
        );
    }
  };

  const handleClose = () => {
    setCurrentStep("upload");
    setFile(null);
    setFileName("");
    setFileSizeStr("");
    setParsedRows([]);
    setIsParsingFile(false);
    setParseError(null);
    setInferredSchema({});
    setColumnMappings([]);
    setIsInferenceLoading(false);
    setPreviewSearch("");
    setPreviewPage(1);
    setValidationIssues([]);
    setSkipInvalidRows(false);
    setIsImporting(false);
    setImportProgressText("");
    setImportError(null);
    setImportResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header & Stepper */}
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center justify-between pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 rounded-xl">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Spreadsheet Import Wizard</span>
                  <span className="text-xs font-normal text-slate-400">
                    &bull; {database.name || "Project Database"}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Import CSV or XLSX files with intelligent schema inference and validation.
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isImporting}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-7 gap-1 pt-1">
            {STEP_DEFINITIONS.map((s, idx) => {
              const stepIndex = STEP_DEFINITIONS.findIndex((x) => x.id === currentStep);
              const isPast = idx < stepIndex;
              const isCurrent = s.id === currentStep;

              return (
                <div key={s.id} className="flex flex-col items-center text-center">
                  <div className="w-full flex items-center">
                    <div
                      className={`h-1.5 w-full rounded-full transition-all ${
                        isCurrent
                          ? "bg-blue-600"
                          : isPast
                          ? "bg-emerald-500"
                          : "bg-slate-200 dark:bg-slate-800"
                      }`}
                    />
                  </div>
                  <span
                    className={`text-[10px] font-semibold mt-1.5 truncate max-w-[80px] ${
                      isCurrent
                        ? "text-blue-600 dark:text-blue-400"
                        : isPast
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-slate-400"
                    }`}
                  >
                    {idx + 1}. {s.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* STEP 1: UPLOAD */}
          {currentStep === "upload" && (
            <div className="space-y-6 py-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition bg-slate-50/40 dark:bg-slate-800/20 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 group"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <div className="p-4 bg-blue-100/70 dark:bg-blue-900/40 text-blue-600 rounded-2xl mb-4 group-hover:scale-110 transition duration-200">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                  Drop your CSV or XLSX spreadsheet here
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">
                  Drag and drop your data file, or browse files from your computer. Supports .csv, .xlsx, and .xls formats.
                </p>
                <div className="mt-4 inline-flex items-center space-x-2 px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs">
                  <span>Browse Files</span>
                </div>
              </div>

              {parseError && (
                <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {isParsingFile && (
                <div className="flex items-center justify-center p-6 space-x-3 text-xs text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <span>Reading and analyzing spreadsheet structure...</span>
                </div>
              )}

              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  Need a test dataset? Use the preconfigured project template.
                </div>
                <button
                  type="button"
                  onClick={handleSampleTemplate}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  <span>Use Sample CSV Template</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: DETECTED TYPE */}
          {currentStep === "detected" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl p-3.5 text-xs text-blue-900 dark:text-blue-200">
                <div className="flex items-center space-x-2.5">
                  <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div>
                    <span className="font-semibold">
                      Zyoris Intelligent Import Engine (BE-1) Inferred {columnMappings.length} Columns
                    </span>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                      Found {parsedRows.length} rows in <span className="font-medium">{fileName}</span> ({fileSizeStr}). Review the detected types below before mapping.
                    </p>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Source Header</th>
                      <th className="p-3">Detected Type</th>
                      <th className="p-3">Sample Values from File</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {columnMappings.map((col) => (
                      <tr key={col.sourceColumn} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          {col.sourceColumn}
                        </td>
                        <td className="p-3">{renderTypeBadge(col.inferredType)}</td>
                        <td className="p-3 text-slate-500">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {col.sampleValues.slice(0, 3).map((val, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 max-w-[160px] truncate"
                              >
                                {String(val)}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: MAPPING */}
          {currentStep === "mapping" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Editable Column Mapping
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Rename target database properties, correct types, or exclude unneeded columns.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetMapping}
                  className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:underline"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reset to Inferred</span>
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3 w-12 text-center">Include</th>
                      <th className="p-3">Source Header</th>
                      <th className="p-3">Target Property Name</th>
                      <th className="p-3">Property Type</th>
                      <th className="p-3">Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {columnMappings.map((col, idx) => (
                      <tr
                        key={col.sourceColumn}
                        className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition ${
                          !col.included ? "opacity-40" : ""
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={col.included}
                            onChange={(e) => handleMappingChange(idx, "included", e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                          {col.sourceColumn}
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={col.targetName}
                            disabled={!col.included}
                            onChange={(e) => handleMappingChange(idx, "targetName", e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="p-3">
                          <select
                            value={col.selectedType}
                            disabled={!col.included}
                            onChange={(e) =>
                              handleMappingChange(idx, "selectedType", e.target.value as DatabasePropertyType)
                            }
                            className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none text-slate-900 dark:text-white"
                          >
                            <option value="TEXT">Text (Single-line)</option>
                            <option value="NUMBER">Number</option>
                            <option value="SELECT">Select</option>
                            <option value="DATE">Date</option>
                            <option value="CHECKBOX">Checkbox</option>
                            <option value="URL">URL</option>
                          </select>
                        </td>
                        <td className="p-3 text-slate-400 text-[11px] truncate max-w-[140px]">
                          {col.sampleValues[0] !== undefined ? String(col.sampleValues[0]) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: PREVIEW (20–50 ROWS) */}
          {currentStep === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600" />
                    <span>Live Tabular Preview (First 20–50 Rows)</span>
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Previewing records with target column mappings applied prior to validation.
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search preview..."
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200 w-48"
                    />
                  </div>
                </div>
              </div>

              {/* Data Grid Preview */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-h-[380px] shadow-xs">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5 w-10 text-center font-mono text-[10px] text-slate-400 bg-slate-100/60 dark:bg-slate-800">
                        #
                      </th>
                      {activeMappings.map((col) => (
                        <th key={col.targetName} className="p-2.5 border-r border-slate-200/60 dark:border-slate-800">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{col.targetName}</span>
                            {renderTypeBadge(col.selectedType)}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-normal text-slate-700 dark:text-slate-300">
                    {parsedRows
                      .slice(0, 50)
                      .filter((row) => {
                        if (!previewSearch.trim()) return true;
                        return Object.values(row).some((v) =>
                          String(v).toLowerCase().includes(previewSearch.toLowerCase())
                        );
                      })
                      .map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                          <td className="p-2 text-center text-[10px] text-slate-400 font-mono bg-slate-50/30 dark:bg-slate-800/20">
                            {idx + 1}
                          </td>
                          {activeMappings.map((col) => (
                            <td
                              key={col.targetName}
                              className="p-2 border-r border-slate-100 dark:border-slate-800 max-w-[200px] truncate"
                            >
                              {row[col.sourceColumn] !== undefined && row[col.sourceColumn] !== ""
                                ? String(row[col.sourceColumn])
                                : <span className="text-slate-400 italic">null</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>
                  Showing preview of {Math.min(50, parsedRows.length)} of {parsedRows.length} total records from spreadsheet
                </span>
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {activeMappings.length} columns included
                </span>
              </div>
            </div>
          )}

          {/* STEP 5: VALIDATION */}
          {currentStep === "validation" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                      Valid Rows
                    </span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
                    {parsedRows.length - new Set(validationIssues.map((i) => i.rowIndex)).size} / {parsedRows.length}
                  </div>
                </div>

                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-amber-800 dark:text-amber-200">
                      Formatting Warnings
                    </span>
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-1">
                    {validationIssues.filter((i) => i.severity === "warning").length}
                  </div>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Target Columns
                    </span>
                    <Layers className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-1">
                    {activeMappings.length}
                  </div>
                </div>
              </div>

              {/* Issues List */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-white dark:bg-slate-900 space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Data Quality Diagnostics</span>
                  {validationIssues.length === 0 ? (
                    <span className="text-emerald-600 text-[11px] font-normal">&bull; Zero errors found!</span>
                  ) : (
                    <span className="text-amber-600 text-[11px] font-normal">
                      &bull; {validationIssues.length} items flagged for review
                    </span>
                  )}
                </h4>

                {validationIssues.length === 0 ? (
                  <div className="py-6 flex flex-col items-center justify-center text-center text-xs text-slate-500 space-y-2">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-full">
                      <Check className="w-6 h-6" />
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      All row records conform to your mapped types!
                    </span>
                    <span className="text-[11px] text-slate-400">
                      You are ready to proceed to the transaction commit step.
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {validationIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            Row {issue.rowIndex}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {issue.column}:
                          </span>
                          <span className="text-slate-500">{issue.message}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">value: &quot;{String(issue.value)}&quot;</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: IMPORT CONFIRMATION */}
          {currentStep === "import" && (
            <div className="space-y-4 py-2">
              <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/40 dark:bg-slate-800/30 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-blue-600" />
                  <span>Ready to Commit Transactional Bulk Import</span>
                </h3>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px]">Destination Database</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {database.name || "Project Database"}
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px]">Source File</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {fileName} ({parsedRows.length} rows)
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px]">Columns to Persist</span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      {activeMappings.length} properties ({activeMappings.map((m) => m.targetName).join(", ")})
                    </p>
                  </div>
                  <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                    <span className="text-slate-400 text-[11px]">Commit Mode</span>
                    <p className="font-semibold text-emerald-600">
                      Batch Append (Transactional)
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                  Clicking <strong>&quot;Execute Bulk Import&quot;</strong> calls BE-1&apos;s <code>POST /workspace/databases/:id/import/commit</code> to atomically create new column properties and insert all {parsedRows.length} rows.
                </div>
              </div>

              {importError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {isImporting && (
                <div className="p-6 flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {importProgressText}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP 7: RESULT SUMMARY */}
          {currentStep === "result" && importResult && (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-4 bg-emerald-100/70 dark:bg-emerald-950 text-emerald-600 rounded-3xl animate-in zoom-in-50 duration-200">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Spreadsheet Imported Successfully!
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Your database properties and batch records have been committed to the database.
              </p>

              <div className="grid grid-cols-3 gap-3 w-full max-w-md pt-2">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Rows Inserted</span>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {importResult.rowsInserted}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Columns Added</span>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {importResult.columnsCount}
                  </div>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                  <span className="text-[10px] uppercase font-semibold text-slate-400">Elapsed Time</span>
                  <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {(importResult.elapsedMs / 1000).toFixed(1)}s
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Navigation */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between">
          <div>
            {currentStep !== "upload" && currentStep !== "result" && (
              <button
                type="button"
                disabled={isImporting}
                onClick={() => {
                  if (currentStep === "detected") setCurrentStep("upload");
                  else if (currentStep === "mapping") setCurrentStep("detected");
                  else if (currentStep === "preview") setCurrentStep("mapping");
                  else if (currentStep === "validation") setCurrentStep("preview");
                  else if (currentStep === "import") setCurrentStep("validation");
                }}
                className="inline-flex items-center space-x-1 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 dark:hover:bg-slate-700 rounded-xl transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {currentStep !== "result" ? (
              <>
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={handleClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>

                {currentStep === "upload" && (
                  <button
                    type="button"
                    disabled={!file || isParsingFile}
                    onClick={() => setCurrentStep("detected")}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition"
                  >
                    <span>Next: Detected Types</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {currentStep === "detected" && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep("mapping")}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                  >
                    <span>Next: Configure Mapping</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {currentStep === "mapping" && (
                  <button
                    type="button"
                    disabled={activeMappings.length === 0}
                    onClick={() => setCurrentStep("preview")}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition"
                  >
                    <span>Next: Preview (20–50 Rows)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {currentStep === "preview" && (
                  <button
                    type="button"
                    onClick={runValidationScan}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                  >
                    <span>Next: Validate Records</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {currentStep === "validation" && (
                  <button
                    type="button"
                    onClick={() => setCurrentStep("import")}
                    className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition"
                  >
                    <span>Next: Import Confirmation</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {currentStep === "import" && (
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={handleExecuteImport}
                    className="inline-flex items-center space-x-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 transition"
                  >
                    {isImporting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>Execute Bulk Import</span>
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-xs transition"
              >
                View in Database Table
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
