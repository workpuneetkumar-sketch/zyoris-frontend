"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Customer360Page } from "@/components/customers/Customer360Page";
import { Customer360Skeleton } from "@/components/customers/Customer360Skeleton";
import { CustomerEditModal } from "@/components/customers/CustomerEditModal";
import { fetchCanonicalCustomerById } from "@/lib/api/customersApi";
import type { CanonicalCustomer } from "@/types/customers";

export default function CustomerDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";
  const editOpen = searchParams?.get("edit") === "1";

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [canonical, setCanonical] = useState<CanonicalCustomer | null>(null);

  useEffect(() => {
    setEditModalOpen(!!editOpen);
  }, [editOpen]);

  useEffect(() => {
    if (!id) return;
    let active = true;
    fetchCanonicalCustomerById(id)
      .then((c) => { if (active) setCanonical(c); })
      .catch(() => {});
    return () => { active = false; };
  }, [id]);

  if (!id) return <Customer360Skeleton />;

  return (
    <>
      <Customer360Page
        customerId={id}
        onRequestEdit={() => setEditModalOpen(true)}
        canonicalCustomer={canonical}
      />
      <CustomerEditModal
        isOpen={editModalOpen}
        customer={canonical}
        onClose={() => setEditModalOpen(false)}
        onSaved={(updated) => { setCanonical(updated); }}
      />
    </>
  );
}
