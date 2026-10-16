import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import * as T from "@/types/database";
import { checkAndRunAutomations, isAutoEntrySupported } from "@/lib/automation";

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
    auto_entry: false,
    outstanding: "",
    default_qty: "1",
    default_product_id: ""
  });
  const [products, setProducts] = useState<T.Product[]>([]);

  // Whether the Auto Entry migration has been applied. The toggle is hidden until it has.
  const [autoEntryAvailable, setAutoEntryAvailable] = useState(false);

  useEffect(() => {
    isAutoEntrySupported().then(setAutoEntryAvailable).catch(() => setAutoEntryAvailable(false));
  }, []);

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

  const { franchiseId, impersonatedFranchiseId, role } = useAuth();
  const activeFranchiseId = role === 'superadmin' ? ((impersonatedFranchiseId || franchiseId || '00000000-0000-0000-0000-000000000000')) : (franchiseId || '00000000-0000-0000-0000-000000000000');

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    const [
      { data: custs },
      { data: areaList },
      { data: productList },
      { data: financialData }
    ] = await Promise.all([
      supabase.from('customers').select('*, area:areas(*)').eq('franchise_id', activeFranchiseId).order('name', { ascending: true }),
      supabase.from('areas').select('*').eq('franchise_id', activeFranchiseId).order('name', { ascending: true }),
      supabase.from('products').select('*').eq('franchise_id', activeFranchiseId).order('name', { ascending: true }),
      supabase.from('customer_financials').select('*').eq('franchise_id', activeFranchiseId)
    ]);

    if (custs) {
      const merged = (custs as any[]).map(c => ({
        ...c,
        financials: (financialData as T.CustomerFinancials[] || []).find(f => f.id === c.id)
      }));
      setCustomers(merged);
      
      const pageCacheKey = `milkow_customers_page_${activeFranchiseId}`;
      const pageCacheData = {
         customers: merged,
         areas: areaList || [],
         products: productList || []
      };
      localStorage.setItem(pageCacheKey, JSON.stringify(pageCacheData));
    }
    if (areaList) setAreas(areaList as T.Area[]);
    if (productList) setProducts(productList as T.Product[]);
    setIsLoading(false);
  }, [activeFranchiseId]);

  useEffect(() => {
    // Attempt to load full page state from cache first for instant render
    const pageCacheKey = `milkow_customers_page_${activeFranchiseId}`;
    const cachedPage = localStorage.getItem(pageCacheKey);
    
    if (cachedPage) {
       try {
          const parsed = JSON.parse(cachedPage);
          if (parsed.customers) setCustomers(parsed.customers);
          if (parsed.areas) setAreas(parsed.areas);
          if (parsed.products) setProducts(parsed.products);
          setIsLoading(false);
       } catch (e) {}
    }

    fetchData(!!cachedPage);

    const sub = supabase.channel('cust_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `franchise_id=eq.${activeFranchiseId}` }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'areas', filter: `franchise_id=eq.${activeFranchiseId}` }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments', filter: `franchise_id=eq.${activeFranchiseId}` }, () => fetchData(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bills', filter: `franchise_id=eq.${activeFranchiseId}` }, () => fetchData(true))
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [fetchData]);

  useEffect(() => {
    localStorage.setItem('milkow_selected_route', selectedAreaId);
  }, [selectedAreaId]);

  // Reset invalid selected area from localStorage if it doesn't belong to this franchise
  useEffect(() => {
    if (areas.length > 0 && selectedAreaId !== "") {
      const isValid = areas.some(a => a.id.toString() === selectedAreaId);
      if (!isValid) setSelectedAreaId("");
    }
  }, [areas, selectedAreaId]);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!newCustomer.name || !newCustomer.phone || !newCustomer.area_id) return;

    setIsSubmitting(true);

    const customerToSave = { ...newCustomer };

    setIsModalOpen(false);
    setNewCustomer({
      name: "",
      phone: "",
      area_id: "",
      frequency: "Morning Only",
      auto_entry: false,
      outstanding: "",
      default_qty: "1",
      default_product_id: ""
    });

    setModalConfig({
      isOpen: true,
      title: "Registration Success",
      message: `${customerToSave.name} has been added to the system successfully!`,
      type: 'success',
      onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
      confirmText: "Great"
    });

    try {
      // Background execution
      const runAsync = async () => {
        const { data: lastCustomer } = await supabase
          .from('customers')
          .select('delivery_order')
          .eq('franchise_id', activeFranchiseId)
          .eq('area_id', parseInt(customerToSave.area_id))
          .order('delivery_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        const newOrder = lastCustomer ? Number(lastCustomer.delivery_order) + 1000 : 1000;

        const { error: insertError } = await supabase.from('customers').insert({
          name: customerToSave.name,
          phone: customerToSave.phone,
          area_id: parseInt(customerToSave.area_id),
          franchise_id: activeFranchiseId,
          frequency: customerToSave.frequency,
          status: 'Active',
          default_qty: parseInt(customerToSave.default_qty) || 1,
          default_product_id: customerToSave.default_product_id || null,
          past_outstanding: parseFloat(customerToSave.outstanding) || 0,
          delivery_order: newOrder,
          // Only included once the migration has been applied — inserting a column that
          // doesn't exist would fail the whole customer insert.
          ...(autoEntryAvailable ? { auto_entry: customerToSave.auto_entry === true } : {})
        });

        if (insertError) {
          console.error("Insert error:", insertError);
          throw insertError;
        }

        await checkAndRunAutomations(activeFranchiseId);
        fetchData(true);
      };

      runAsync().catch((err: any) => {
        console.error("Failed to add customer:", err);
        // Show failure modal if they are still on page
        setModalConfig({
          isOpen: true,
          title: "Registration Failed",
          message: err.message || "Something went wrong while adding the customer. Please try again.",
          type: 'danger',
          onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
          confirmText: "Try Again"
        });
      }).finally(() => {
        setIsSubmitting(false);
      });

    } catch (err: any) {
      console.error("Trigger failed:", err);
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
    autoEntryAvailable,
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
