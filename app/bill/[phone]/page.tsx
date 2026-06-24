"use client";

import { use } from "react";
import PublicBillPage from "../page";

interface PageProps {
  params: Promise<{ phone: string }>;
}

export default function Page({ params }: PageProps) {
  const resolvedParams = use(params);
  return <PublicBillPage initialPhone={resolvedParams.phone} />;
}
