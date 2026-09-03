import api from "./api";
import { fetchCustomers } from "./customersApi";

export interface SearchResult {
  id: string;
  type: "Lead" | "Deal" | "Contact" | "Company" | "Customer";
  title: string;
  secondary?: string;
}

export interface SearchResponse {
  leads?: SearchResult[];
  deals?: SearchResult[];
  contacts?: SearchResult[];
  companies?: SearchResult[];
  customers?: SearchResult[];
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

// Helper to convert a customer object to a SearchResult
function customerToSearchResult(customer: any): SearchResult {
  // Assuming customer has at least an id and a name
  const title = customer.name || customer.companyName || customer.organizationName || "Unknown Customer";
  const secondary = customer.email || customer.phone || customer.website || "";

  return {
    id: customer.id || customer._id || String(Date.now()),
    type: "Customer",
    title,
    secondary: secondary || undefined,
  };
}

export async function searchCrm(query: string): Promise<SearchResponse> {
  // Execute both searches in parallel
  const [crmRes, customersRes] = await Promise.all([
    api.get<BackendSearchResponse>("/crm/search", { params: { q: query } }),
    fetchCustomers({ page: 1, limit: 10, filters: { search: query } }),
  ]).catch((err) => {
    // If one of the requests fails, we still want to proceed with the other
    console.error("One of the search requests failed:", err);
    return [undefined, undefined] as const;
  });

  // Group results into our format
  const response: SearchResponse = {
    leads: [],
    deals: [],
    contacts: [],
    companies: [],
    customers: [],
  };

  // Process CRM search results (leads, deals, contacts, companies)
  if (crmRes?.data?.results && Array.isArray(crmRes.data.results)) {
    crmRes.data.results.forEach((item) => {
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

  // Process customer search results
  if (customersRes?.customers && Array.isArray(customersRes.customers)) {
    customersRes.customers.forEach((customer) => {
      const result = customerToSearchResult(customer);
      response.customers?.push(result);
    });
  }

  return response;
}
