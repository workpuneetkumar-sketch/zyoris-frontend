"use client";

import { useState, useEffect, useCallback } from "react";
import api from "@/lib/api/api";

export interface EntityOption {
  id: string;
  name: string;
  email?: string;
  type: "LEAD" | "CONTACT" | "DEAL";
  details?: string;
}

export function useSalesEntities() {
  const [leads, setLeads] = useState<EntityOption[]>([]);
  const [contacts, setContacts] = useState<EntityOption[]>([]);
  const [deals, setDeals] = useState<EntityOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchEntities = useCallback(async () => {
    setLoading(true);

    // Default fallbacks in case API returns empty
    const fallbackLeads: EntityOption[] = [
      { id: "cmuh5figl064hobm55o4gj0jt", name: "Acme Lead (Demo)", email: "Demo@zyrois.local", type: "LEAD", details: "Website Lead" },
      { id: "lead_enterprise_1", name: "Sarah Jenkins (Acme Corp)", email: "sarah.j@acme.corp", type: "LEAD", details: "Enterprise Lead" },
    ];
    const fallbackContacts: EntityOption[] = [
      { id: "cmubecbbm01go124m7lkrowav", name: "ATUL JHA", email: "atulcoder27@gmail.com", type: "CONTACT", details: "Sales Manager" },
      { id: "contact_corp_1", name: "John Doe (VP Procurement)", email: "johndoe@corp.com", type: "CONTACT", details: "Primary Buyer" },
    ];
    const fallbackDeals: EntityOption[] = [
      { id: "deal_500", name: "Enterprise Annual Contract - 100 Seats", type: "DEAL", details: "$45,000 - Discovery Demo" },
      { id: "deal_999", name: "Custom Cloud Deployment Deal", type: "DEAL", details: "$18,500 - Proposal Sent" },
    ];

    try {
      // 1. Fetch Leads
      try {
        const resLeads = await api.get("/api/leads/get-leads");
        const rawLeads = resLeads?.data?.data || resLeads?.data;
        if (Array.isArray(rawLeads) && rawLeads.length > 0) {
          setLeads(
            rawLeads.map((l: any) => ({
              id: l.id,
              name: l.name || l.company || "Lead",
              email: l.email || "",
              type: "LEAD",
              details: l.source || l.status || "Lead",
            }))
          );
        } else {
          setLeads(fallbackLeads);
        }
      } catch {
        setLeads(fallbackLeads);
      }

      // 2. Fetch Contacts
      try {
        const resContacts = await api.get("/api/contact/get-contacts");
        const rawContacts = resContacts?.data?.data || resContacts?.data;
        if (Array.isArray(rawContacts) && rawContacts.length > 0) {
          setContacts(
            rawContacts.map((c: any) => ({
              id: c.id,
              name: c.name || c.email || "Contact",
              email: c.email || "",
              type: "CONTACT",
              details: c.position || c.companyName || "Contact",
            }))
          );
        } else {
          setContacts(fallbackContacts);
        }
      } catch {
        setContacts(fallbackContacts);
      }

      // 3. Fetch Deals
      try {
        const resDeals = await api.get("/api/deals");
        const rawDeals = resDeals?.data?.data || resDeals?.data;
        if (Array.isArray(rawDeals) && rawDeals.length > 0) {
          setDeals(
            rawDeals.map((d: any) => ({
              id: d.id,
              name: d.title || d.name || "Deal",
              type: "DEAL",
              details: d.amount ? `$${d.amount} - ${d.stage || ""}` : d.stage || "Deal",
            }))
          );
        } else {
          setDeals(fallbackDeals);
        }
      } catch {
        setDeals(fallbackDeals);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  return { leads, contacts, deals, loading, refresh: fetchEntities };
}
