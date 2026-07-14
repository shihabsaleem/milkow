import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import * as T from "@/types/database";

export function useProfileLogic() {
  const router = useRouter();
  const { logout, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/404");
    }
  }, [user, loading, router]);

  const [adminName, setAdminName] = useState("Franchisee.");
  const [payeeName, setPayeeName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [pin, setPin] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const [autoCloseEnabled, setAutoCloseEnabled] = useState(true);
  const [morningCloseTime, setMorningCloseTime] = useState("23:59");
  const [eveningCloseTime, setEveningCloseTime] = useState("23:59");

  const [paytmEnabled, setPaytmEnabled] = useState(false);
  const [paytmMid, setPaytmMid] = useState("");
  const [paytmMerchantKey, setPaytmMerchantKey] = useState("");

  const [areas, setAreas] = useState<T.Area[]>([]);
  const [franchiseName, setFranchiseName] = useState("");
  const [newRoute, setNewRoute] = useState("");
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const [routeSuccess, setRouteSuccess] = useState(false);
  const [editingRouteId, setEditingRouteId] = useState<number | null>(null);
  const [editingRouteName, setEditingRouteName] = useState("");
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (routeSuccess) {
      const timer = setTimeout(() => setRouteSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [routeSuccess]);

  const { franchiseId, impersonatedFranchiseId, role } = useAuth();
  const activeFranchiseId = role === 'superadmin' ? ((impersonatedFranchiseId || franchiseId || '00000000-0000-0000-0000-000000000000')) : (franchiseId || '00000000-0000-0000-0000-000000000000');

  const fetchSettings = useCallback(async (silent = false) => {
    const { data } = await supabase.from('system_settings').select('*').eq('franchise_id', activeFranchiseId).eq('key', 'general').maybeSingle();
    if (data) {
      const val = data.value as T.Settings;
      setAdminName(val.system_user?.name || "Franchisee.");
      setPin(val.system_user?.pin || "");
      setPayeeName(val.payment?.payee_name || "");
      setUpiId(val.payment?.upi_id || "");
    }

    const { data: paytmData } = await supabase.from('system_settings').select('*').eq('franchise_id', activeFranchiseId).eq('key', 'paytm').maybeSingle();
    if (paytmData && paytmData.value) {
      const paytmVal = paytmData.value as any;
      setPaytmEnabled(paytmVal.enabled ?? false);
      setPaytmMid(paytmVal.mid || "");
      setPaytmMerchantKey(paytmVal.merchant_key || "");
    }

    const { data: autoData } = await supabase.from('system_settings').select('*').eq('franchise_id', activeFranchiseId).eq('key', 'automation').maybeSingle();
    if (autoData && autoData.value) {
      const autoVal = autoData.value as T.AutomationSettings;
      setAutoCloseEnabled(autoVal.autoCloseEnabled ?? true);
      setMorningCloseTime(autoVal.morningCloseTime ?? "23:59");
      setEveningCloseTime(autoVal.eveningCloseTime ?? "23:59");
    }

    const { data: areaData } = await supabase.from('areas').select('*').eq('franchise_id', activeFranchiseId).order('name', { ascending: true });
    if (areaData) setAreas(areaData as T.Area[]);

    const { data: franchiseData } = await supabase.from('franchises').select('name').eq('id', activeFranchiseId).maybeSingle();
    if (franchiseData?.name) setFranchiseName(franchiseData.name);
  }, [activeFranchiseId]);

  useEffect(() => {
    fetchSettings();
    const sub = supabase.channel('profile_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings', filter: `franchise_id=eq.${activeFranchiseId}` }, () => fetchSettings(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'areas', filter: `franchise_id=eq.${activeFranchiseId}` }, () => fetchSettings(true))
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [fetchSettings]);

  const handleSave = async () => {
    setIsSaved(true);
    const pinToSave = pin;
    setPin("");
    setTimeout(() => setIsSaved(false), 2000);

    try {
      const runAsync = async () => {
        await supabase.from('system_settings').upsert({
          key: 'general',
          franchise_id: activeFranchiseId,
          value: {
            payment: { payee_name: payeeName, upi_id: upiId, currency_code: "INR" },
            system_user: { name: adminName, pin: pinToSave }
          }
        });

        if (pinToSave && pinToSave.length >= 6) {
          if (role === 'superadmin' && impersonatedFranchiseId) {
            // Use Admin API to reset franchisee password without affecting superadmin session
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch('/api/franchise/password', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
              },
              body: JSON.stringify({
                franchiseId: impersonatedFranchiseId,
                newPassword: pinToSave
              })
            });
            if (!res.ok) {
              const data = await res.json();
              throw new Error(data.error || "Failed to reset franchisee password");
            }
          } else {
            // Normal update for current session user
            const { error: authError } = await supabase.auth.updateUser({ password: pinToSave });
            if (authError) throw authError;
          }
        }

        const { data: autoData } = await supabase.from('system_settings').select('value').eq('franchise_id', activeFranchiseId).eq('key', 'automation').maybeSingle();
        const existingAuto = (autoData?.value as T.AutomationSettings) || { lastRouteReset: '', lastBillGeneration: '' };
        await supabase.from('system_settings').upsert({
          key: 'automation',
          franchise_id: activeFranchiseId,
          value: {
            ...existingAuto,
            autoCloseEnabled,
            morningCloseTime,
            eveningCloseTime
          }
        });

        await supabase.from('system_settings').upsert({
          key: 'paytm',
          franchise_id: activeFranchiseId,
          value: {
            enabled: paytmEnabled,
            mid: paytmMid,
            merchant_key: paytmMerchantKey
          }
        });
        
        fetchSettings(true);
      };

      runAsync().catch(e => {
        const err = e as Error;
        console.error("Failed to save settings:", err.message);
        fetchSettings(true);
      });
    } catch (e: unknown) {
      const err = e as Error;
      console.error("Failed to trigger save settings:", err.message);
      fetchSettings(true);
    }
  };

  const addRoute = async () => {
    const name = newRoute.trim();
    if (!name || isAddingRoute) return;

    setIsAddingRoute(true);
    try {
      const { data, error } = await supabase.from('areas').insert({ name, franchise_id: activeFranchiseId }).select().single();
      if (error) throw error;

      if (data) {
        setAreas(prev => [...prev, data as T.Area].sort((a, b) => a.name.localeCompare(b.name)));
      }

      setNewRoute('');
      setRouteSuccess(true);
      setTimeout(() => listEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e: unknown) {
      const err = e as Error;
      console.error("Failed to add route:", err.message);
    } finally {
      setIsAddingRoute(false);
    }
  };

  const removeRoute = async (id: number) => {
    // Optimistic UI Update
    setAreas(prev => prev.filter(a => a.id !== id));

    try {
      const runAsync = async () => {
        const { error } = await supabase.from('areas').delete().eq('id', id);
        if (error) throw error;
        fetchSettings(true);
      };
      runAsync().catch((err) => {
        console.error("Failed to remove route:", err.message);
        fetchSettings(true); // revert
      });
    } catch (e: unknown) {
      const err = e as Error;
      console.error("Failed to trigger remove route:", err.message);
      fetchSettings(true);
    }
  };

  const editRoute = async (id: number, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    // Optimistic UI Update
    setAreas(prev => prev.map(a => a.id === id ? { ...a, name: trimmed } : a).sort((a, b) => a.name.localeCompare(b.name)));
    setEditingRouteId(null);
    setEditingRouteName("");

    try {
      const runAsync = async () => {
        const { error } = await supabase.from('areas').update({ name: trimmed }).eq('id', id);
        if (error) throw error;
        fetchSettings(true);
      };
      runAsync().catch((err) => {
        console.error("Failed to edit route:", err.message);
        fetchSettings(true); // revert
      });
    } catch (e: unknown) {
      const err = e as Error;
      console.error("Failed to trigger edit route:", err.message);
      fetchSettings(true);
    }
  };

  const handleLogout = async () => {
    await logout();
    document.cookie = "milkow_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  };

  return {
    router,
    user,
    loading,
    adminName,
    setAdminName,
    payeeName,
    setPayeeName,
    upiId,
    setUpiId,
    pin,
    setPin,
    isSaved,
    autoCloseEnabled,
    setAutoCloseEnabled,
    morningCloseTime,
    setMorningCloseTime,
    eveningCloseTime,
    setEveningCloseTime,
    paytmEnabled,
    setPaytmEnabled,
    paytmMid,
    setPaytmMid,
    paytmMerchantKey,
    setPaytmMerchantKey,
    areas,
    newRoute,
    setNewRoute,
    isAddingRoute,
    routeSuccess,
    listEndRef,
    handleSave,
    addRoute,
    removeRoute,
    editRoute,
    editingRouteId,
    setEditingRouteId,
    editingRouteName,
    setEditingRouteName,
    handleLogout,
    fetchSettings,
    role,
    franchiseName
  };
}
