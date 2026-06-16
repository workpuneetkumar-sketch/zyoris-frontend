import api from "./api";

export interface SearchResult {
  id: string;
  type: "Lead" | "Deal" | "Contact" | "Company";
  title: string;
  secondary?: string;
}

export interface SearchResponse {
  leads?: SearchResult[];
  deals?: SearchResult[];
  contacts?: SearchResult[];
  companies?: SearchResult[];
}

interface BackendSearchItem {
  type: "lead" | "deal" | "contact" | "company";
  data: any;
}

interface BackendSearchResponse {
  results: BackendSearchItem[];
}

// Helper to extract title and secondary from data (based on common patterns)
function extractResult(item: BackendSearchItem): SearchResult {
  const typeMap: Record<string, SearchResult["type"]> = {
    lead: "Lead",
    deal: "Deal",
    contact: "Contact",
    company: "Company",
  };

  const data = item.data;
  let title = "Unknown";
  let secondary: string | undefined;

  if (item.type === "lead" || item.type === "contact") {
    title = data.name || data.fullName || data.firstName + " " + data.lastName || "Unknown";
    secondary = data.email || data.company || data.phone;
  } else if (item.type === "deal") {
    title = data.name || data.title || "Unknown Deal";
    secondary = data.amount ? `$${data.amount.toLocaleString()}` : data.company;
  } else if (item.type === "company") {
    title = data.name || data.companyName || "Unknown Company";
    secondary = data.website || data.industry;
  }

  return {
    id: data.id || data._id || String(Date.now()),
    type: typeMap[item.type] || "Lead",
    title,
    secondary,
  };
}

export async function searchCrm(query: string): Promise<SearchResponse> {
  const res = await api.get<BackendSearchResponse>("/crm/search", {
    params: { q: query },
  });

  // Group results into our format
  const response: SearchResponse = {
    leads: [],
    deals: [],
    contacts: [],
    companies: [],
  };

  if (res.data.results && Array.isArray(res.data.results)) {
    res.data.results.forEach((item) => {
      const result = extractResult(item);
      switch (result.type) {
        case "Lead":
          response.leads?.push(result);
          break;
        case "Deal":
          response.deals?.push(result);
          break;
        case "Contact":
          response.contacts?.push(result);
          break;
        case "Company":
          response.companies?.push(result);
          break;
      }
    });
  }

  return response;
}
