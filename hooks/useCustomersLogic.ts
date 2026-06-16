import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import * as T from "@/types/database";
import { checkAndRunAutomations } from "@/lib/automation";

export function useCustomersLogic() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/404");
    }
  }, [user, loading, router]);

  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [customers, setCustomers] = useState<(T.Customer & { area: T.Area; financials?: T.CustomerFinancials })[]>([]);
  const [areas, setAreas] = useState<T.Area[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem('milkow_selected_route');
      return saved === null ? "" : saved;
    }
    return "";
  });
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    area_id: "",
    frequency: "Morning Only",
    outstanding: "",
    default_qty: "1",
    default_product_id: ""
  });
  const [products, setProducts] = useState<T.Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'info' | 'success';
    confirmText?: string;
    showDontShowAgain?: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
    type: 'info'
  });

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    const [
      { data: custs },
      { data: areaList },
      { data: productList },
      { data: financialData }
    ] = await Promise.all([
      supabase.from('customers').select('*, area:areas(*)').order('name', { ascending: true }),
      supabase.from('areas').select('*').order('name', { ascending: true }),
      supabase.from('products').select('*').order('name', { ascending: true }),
      supabase.from('customer_financials').select('*')
    ]);

    if (custs) {
      const merged = (custs as any[]).map(c => ({
        ...c,
        financials: (financialData as T.CustomerFinancials[] || []).find(f => f.id === c.id)
      }));
      setCustomers(merged);
    }
    if (areaList) setAreas(areaList as T.Area[]);
    if (productList) setProducts(productList as T.Product[]);
    if (!silent) setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();

    const sub = supabase.channel('cust_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'areas' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => fetchData(true))
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [fetchData]);

  useEffect(() => {
    localStorage.setItem('milkow_selected_route', selectedAreaId);
  }, [selectedAreaId]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!newCustomer.name || !newCustomer.phone || !newCustomer.area_id) return;
    try {
      setIsSubmitting(true);

      const { data: lastCustomer } = await supabase
        .from('customers')
        .select('delivery_order')
        .eq('area_id', parseInt(newCustomer.area_id))
        .order('delivery_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const newOrder = lastCustomer ? Number(lastCustomer.delivery_order) + 1000 : 1000;

      const { error: insertError } = await supabase.from('customers').insert({
        name: newCustomer.name,
        phone: newCustomer.phone,
        area_id: parseInt(newCustomer.area_id),
        frequency: newCustomer.frequency,
        status: 'Active',
        default_qty: parseInt(newCustomer.default_qty) || 1,
        default_product_id: newCustomer.default_product_id || null,
        past_outstanding: parseFloat(newCustomer.outstanding) || 0,
        delivery_order: newOrder
      });

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }

      await checkAndRunAutomations();

      setIsModalOpen(false);
      setNewCustomer({
        name: "",
        phone: "",
        area_id: "",
        frequency: "Morning Only",
        outstanding: "",
        default_qty: "1",
        default_product_id: ""
      });
      await fetchData();

      setModalConfig({
        isOpen: true,
        title: "Registration Success",
        message: `${newCustomer.name} has been added to the system successfully!`,
        type: 'success',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
        confirmText: "Great"
      });
    } catch (err: any) {
      console.error("Failed to add customer:", err);
      setModalConfig({
        isOpen: true,
        title: "Registration Failed",
        message: err.message || "Something went wrong while adding the customer. Please try again.",
        type: 'danger',
        onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
        confirmText: "Try Again"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
    const matchesArea = selectedAreaId === "" || c.area_id?.toString() === selectedAreaId;
    return matchesSearch && matchesArea;
  });

  return {
    router,
    searchTerm,
    setSearchTerm,
    isModalOpen,
    setIsModalOpen,
    customers,
    areas,
    selectedAreaId,
    setSelectedAreaId,
    newCustomer,
    setNewCustomer,
    products,
    isLoading,
    isSubmitting,
    modalConfig,
    setModalConfig,
    filteredCustomers,
    handleAddCustomer,
    fetchData
  };
}
