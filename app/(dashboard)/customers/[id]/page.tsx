"use client";

import { useParams } from "next/navigation";
import { Customer360Page } from "@/components/customers/Customer360Page";
import { Customer360Skeleton } from "@/components/customers/Customer360Skeleton";

export default function CustomerDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : Array.isArray(params?.id) ? params.id[0] : "";

  if (!id) return <Customer360Skeleton />;

  return <Customer360Page customerId={id} />;
}
