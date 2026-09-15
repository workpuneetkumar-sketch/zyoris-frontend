import api from "@/lib/api/api";

export interface WorkspaceSearchResultItem {
  id: string;
  title?: string;
  name?: string;
  text?: string;
  type?: string;
  pageId?: string;
  icon?: string;
  coverImage?: string;
  updatedAt?: string;
  createdAt?: string;
  score?: number;
}

export interface WorkspaceSearchResultsGroup {
  items: WorkspaceSearchResultItem[];
  total: number;
}

export interface WorkspaceSearchResponse {
  query: string;
  page: number;
  limit: number;
  results: {
    pages: WorkspaceSearchResultsGroup;
    blocks: WorkspaceSearchResultsGroup;
    databases: WorkspaceSearchResultsGroup;
  };
  totalResults: number;
}

export interface SearchWorkspaceParams {
  q: string;
  page?: number;
  limit?: number;
}

/**
 * Global workspace search.
 * GET /workspace/search?q={query}&page=1&limit=20
 */
export async function searchWorkspace(
  params: SearchWorkspaceParams
): Promise<WorkspaceSearchResponse> {
  const queryTerm = (params.q || "").trim();
  if (!queryTerm) {
    return {
      query: "",
      page: params.page || 1,
      limit: params.limit || 20,
      results: {
        pages: { items: [], total: 0 },
        blocks: { items: [], total: 0 },
        databases: { items: [], total: 0 },
      },
      totalResults: 0,
    };
  }

  try {
    const res = await api.get("/workspace/search", {
      params: {
        q: queryTerm,
        page: params.page || 1,
        limit: params.limit || 20,
      },
    });

    const data = res.data?.data ?? res.data;
    const results = data?.results || {};

    return {
      query: data?.query || queryTerm,
      page: data?.page || params.page || 1,
      limit: data?.limit || params.limit || 20,
      results: {
        pages: {
          items: results.pages?.items || [],
          total: results.pages?.total ?? (results.pages?.items?.length || 0),
        },
        blocks: {
          items: results.blocks?.items || [],
          total: results.blocks?.total ?? (results.blocks?.items?.length || 0),
        },
        databases: {
          items: results.databases?.items || [],
          total: results.databases?.total ?? (results.databases?.items?.length || 0),
        },
      },
      totalResults: data?.totalResults ?? 0,
    };
  } catch (error: any) {
    console.error("Error searching workspace:", error);
    // Safe empty response on network or server error
    return {
      query: queryTerm,
      page: params.page || 1,
      limit: params.limit || 20,
      results: {
        pages: { items: [], total: 0 },
        blocks: { items: [], total: 0 },
        databases: { items: [], total: 0 },
      },
      totalResults: 0,
    };
  }
}
