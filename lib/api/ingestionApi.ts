import api from "./api";

export class IngestionApiError extends Error {
  status?: number;
  code?: string;
  constructor(message: string, status?: number, code?: string) {
    super(message);
    this.name = "IngestionApiError";
    this.status = status;
    this.code = code;
  }
}

export const formatIngestionError = (err: any): IngestionApiError => {
  if (err?.response?.status === 403 || err?.status === 403) {
    return new IngestionApiError("You don't have access to this tool.", 403, "FORBIDDEN");
  }
  const status = err?.response?.status ?? err?.status;
  const msg =
    typeof err?.response?.data?.message === "string"
      ? err.response.data.message
      : err instanceof Error
      ? err.message
      : "An unexpected error occurred.";
  return new IngestionApiError(msg, status);
};

// POST /ingestion/run
export const triggerIngestionApi = async () => {
  try {
    const res = await api.post("/ingestion/run");
    return res.data;
  } catch (err: any) {
    throw formatIngestionError(err);
  }
};

// POST /ingestion/upload
export const uploadIngestionFileApi = async (file: File) => {
  try {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post("/ingestion/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  } catch (err: any) {
    throw formatIngestionError(err);
  }
};

// GET /ingestion/last-analysis
export const getLastAnalysisApi = async () => {
  try {
    const res = await api.get("/ingestion/last-analysis");
    return res.data;
  } catch (err: any) {
    throw formatIngestionError(err);
  }
};

// GET /ingestion/summary
export const getIngestionSummaryApi = async () => {
  try {
    const res = await api.get("/ingestion/summary");
    return res.data;
  } catch (err: any) {
    throw formatIngestionError(err);
  }
};