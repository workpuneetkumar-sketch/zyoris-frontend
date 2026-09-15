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
  type: "lead" | "deal" | "contact" | "company" | "customer";
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
    customer: "Customer",
  };

  const data = item.data;
  let title = "Unknown";
  let secondary: string | undefined;

  if (item.type === "lead" || item.type === "contact") {
    title = data.name || data.fullName || (data.firstName ? `${data.firstName} ${data.lastName || ""}`.trim() : "") || "Unknown";
    secondary = data.email || data.company || data.phone;
  } else if (item.type === "deal") {
    title = data.name || data.title || "Unknown Deal";
    secondary = data.amount ? `$${data.amount.toLocaleString()}` : data.company;
  } else if (item.type === "company") {
    title = data.name || data.companyName || "Unknown Company";
    secondary = data.website || data.industry;
  } else if (item.type === "customer") {
    title = data.name || data.companyName || data.organizationName || "Unknown Customer";
    secondary = data.email || data.phone || data.canonicalType || data.lifecycleState;
  }

  return {
    id: data.id || data._id || String(Date.now()),
    type: typeMap[item.type] || "Lead",
    title,
    secondary: secondary || undefined,
  };
}

// Helper to convert a customer object to a SearchResult
function customerToSearchResult(customer: any): SearchResult {
  const title = customer.name || customer.companyName || customer.organizationName || "Unknown Customer";
  const secondary = customer.email || customer.phone || customer.canonicalType || customer.lifecycleState || customer.website || "";

  return {
    id: customer.id || customer._id || String(Date.now()),
    type: "Customer",
    title,
    secondary: secondary || undefined,
  };
}

export async function searchCrm(query: string): Promise<SearchResponse> {
  // Execute both searches in parallel with allSettled so failure of one does not block the other
  const [crmSettled, customersSettled] = await Promise.allSettled([
    api.get<BackendSearchResponse>("/crm/search", { params: { q: query } }),
    fetchCustomers(
      1,
      {
        search: query,
        lifecycleState: "All States",
        canonicalType: "All Types",
        ownerId: "All Owners",
      },
      10
    ),
  ]);

  // Group results into our format
  const response: SearchResponse = {
    leads: [],
    deals: [],
    contacts: [],
    companies: [],
    customers: [],
  };

  // Process CRM search results (leads, deals, contacts, companies, customers)
  if (crmSettled.status === "fulfilled" && crmSettled.value?.data?.results && Array.isArray(crmSettled.value.data.results)) {
    crmSettled.value.data.results.forEach((item) => {
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
        case "Customer":
          response.customers?.push(result);
          break;
      }
    });
  } else if (crmSettled.status === "rejected") {
    console.error("CRM search request failed:", crmSettled.reason);
  }

  // Process customer search results
  if (customersSettled.status === "fulfilled" && customersSettled.value?.customers && Array.isArray(customersSettled.value.customers)) {
    const existingCustomerIds = new Set(response.customers?.map((c) => c.id));
    customersSettled.value.customers.forEach((customer) => {
      const result = customerToSearchResult(customer);
      if (!existingCustomerIds.has(result.id)) {
        response.customers?.push(result);
        existingCustomerIds.add(result.id);
      }
    });
  } else if (customersSettled.status === "rejected") {
    console.error("Customer search request failed:", customersSettled.reason);
  }

  return response;
}
