import api from "./api";

// POST /ingestion/run
export const triggerIngestionApi = async () => {
    const res = await api.post("/ingestion/run");
    return res.data;
};

// POST /ingestion/upload
export const uploadIngestionFileApi = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post("/ingestion/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
};

// GET /ingestion/last-analysis
export const getLastAnalysisApi = async () => {
    const res = await api.get("/ingestion/last-analysis");
    return res.data;
};

// GET /ingestion/summary
export const getIngestionSummaryApi = async () => {
    const res = await api.get("/ingestion/summary");
    return res.data;
};