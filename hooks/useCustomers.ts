"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import {
  CanonicalCustomer,
  CustomersFilters,
  DEFAULT_CUSTOMERS_FILTERS,
  CUSTOMERS_PER_PAGE,
  CreateCustomerPayload,
  UpdateCustomerPayload,
  ConvertLeadPayload,
  ConvertCompanyPayload,
} from "@/types/customers";
import {
  fetchCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  fetchCanonicalCustomerById,
  convertLeadToCustomer,
  convertCompanyToCustomer,
  fetchCustomerOwners,
} from "@/lib/api/customersApi";

export function useCustomers() {
  const router = useRouter();

  const [customers, setCustomers] = useState<CanonicalCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(CUSTOMERS_PER_PAGE);
  const [totalPages, setTotalPages] = useState(0);
  const [filters, setFilters] = useState<CustomersFilters>(DEFAULT_CUSTOMERS_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    type: "Delete" | null;
    customer: CanonicalCustomer | null;
  }>({ type: null, customer: null });

  const [owners, setOwners] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [ownersLoading, setOwnersLoading] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomers(page, filters, pageSize);
      setCustomers(data.customers);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch customers.");
    } finally {
      setLoading(false);
    }
  }, [page, filters, pageSize]);

  const loadOwners = useCallback(async () => {
    setOwnersLoading(true);
    try {
      const list = await fetchCustomerOwners();
      setOwners(list);
    } catch {
      setOwners([]);
    } finally {
      setOwnersLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    loadOwners();
  }, [loadOwners]);

  function handleFiltersChange(next: CustomersFilters) {
    setFilters(next);
    setPage(1);
  }

  function handleNewCustomer() {
    router.push("/customers/new");
  }

  function handleView(customer: CanonicalCustomer) {
    router.push(`/customers/${customer.id}`);
  }

  function handleEdit(customer: CanonicalCustomer) {
    router.push(`/customers/${customer.id}?edit=1`);
  }

  function handleAction(action: string, customer: CanonicalCustomer) {
    switch (action) {
      case "View":
        handleView(customer);
        break;
      case "Edit":
        handleEdit(customer);
        break;
      case "Delete":
        setConfirmAction({ type: "Delete", customer });
        break;
    }
  }

  const executeDelete = useCallback(async (customer: CanonicalCustomer) => {
    setDeletingId(customer.id);
    try {
      const result = await deleteCustomer(customer.id);
      if (result.success) {
        toast.success(result.message || "Customer deleted successfully");
        setCustomers(prev => prev.filter(c => c.id !== customer.id));
        setTotal(prev => Math.max(0, prev - 1));
        await loadCustomers();
      }
    } catch (err: any) {
      console.error("Delete error:", err);
      toast.error(err.message || "Failed to delete customer");
    } finally {
      setDeletingId(null);
      setOpenMenu(null);
    }
  }, [loadCustomers]);

  async function executeConfirmedAction() {
    const { type, customer } = confirmAction;
    if (!type || !customer) return;
    setConfirmAction({ type: null, customer: null });
    if (type === "Delete") {
      await executeDelete(customer);
    }
  }

  async function handleCreate(payload: CreateCustomerPayload) {
    const created = await createCustomer(payload);
    toast.success("Customer created successfully");
    router.push(`/customers/${created.id}`);
    return created;
  }

  async function handleUpdate(id: string, payload: UpdateCustomerPayload) {
    const updated = await updateCustomer(id, payload);
    toast.success("Customer updated successfully");
    await loadCustomers();
    return updated;
  }

  async function handleLoadSingle(id: string) {
    return fetchCanonicalCustomerById(id);
  }

  async function handleConvertLead(payload: ConvertLeadPayload) {
    const result = await convertLeadToCustomer(payload);
    if (result.success) {
      toast.success(result.message || "Lead converted successfully");
      if (result.customerId) {
        router.push(`/customers/${result.customerId}`);
      } else if (result.dealId) {
        router.push(`/deals/${result.dealId}`);
      }
      await loadCustomers();
    }
    return result;
  }

  async function handleConvertCompany(payload: ConvertCompanyPayload) {
    const result = await convertCompanyToCustomer(payload);
    if (result.success) {
      toast.success(result.message || "Company converted successfully");
      if (result.customerId) {
        router.push(`/customers/${result.customerId}`);
      }
      await loadCustomers();
    }
    return result;
  }

  return {
    customers,
    total,
    page,
    pageSize,
    totalPages,
    filters,
    loading,
    error,
    openMenu,
    deletingId,
    confirmAction,
    owners,
    ownersLoading,
    setPage,
    setPageSize,
    setOpenMenu,
    setConfirmAction,
    handleFiltersChange,
    handleNewCustomer,
    handleAction,
    handleView,
    handleEdit,
    executeConfirmedAction,
    executeDelete,
    handleCreate,
    handleUpdate,
    handleLoadSingle,
    handleConvertLead,
    handleConvertCompany,
    retry: loadCustomers,
    loadOwners,
  };
}
