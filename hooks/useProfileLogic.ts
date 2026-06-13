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

  const [adminName, setAdminName] = useState("Sayas R.");
  const [payeeName, setPayeeName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [pin, setPin] = useState("");
  const [isSaved, setIsSaved] = useState(false);

  const [autoCloseEnabled, setAutoCloseEnabled] = useState(true);
  const [morningCloseTime, setMorningCloseTime] = useState("23:59");
  const [eveningCloseTime, setEveningCloseTime] = useState("23:59");

  const [areas, setAreas] = useState<T.Area[]>([]);
  const [newRoute, setNewRoute] = useState("");
  const [isAddingRoute, setIsAddingRoute] = useState(false);
  const [routeSuccess, setRouteSuccess] = useState(false);
  const listEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (routeSuccess) {
      const timer = setTimeout(() => setRouteSuccess(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [routeSuccess]);

  const fetchSettings = useCallback(async (silent = false) => {
    const { data } = await supabase.from('system_settings').select('*').eq('key', 'general').single();
    if (data) {
      const val = data.value as T.Settings;
      setAdminName(val.system_user?.name || "Sayas R.");
      setPin(val.system_user?.pin || "");
      setPayeeName(val.payment?.payee_name || "");
      setUpiId(val.payment?.upi_id || "");
    }

    const { data: autoData } = await supabase.from('system_settings').select('*').eq('key', 'automation').maybeSingle();
    if (autoData && autoData.value) {
      const autoVal = autoData.value as T.AutomationSettings;
      setAutoCloseEnabled(autoVal.autoCloseEnabled ?? true);
      setMorningCloseTime(autoVal.morningCloseTime ?? "23:59");
      setEveningCloseTime(autoVal.eveningCloseTime ?? "23:59");
    }

    const { data: areaData } = await supabase.from('areas').select('*').order('name', { ascending: true });
    if (areaData) setAreas(areaData as T.Area[]);
  }, []);

  useEffect(() => {
    fetchSettings();
    const sub = supabase.channel('profile_settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'system_settings' }, () => fetchSettings(true))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'areas' }, () => fetchSettings(true))
      .subscribe();
    return () => { sub.unsubscribe(); };
  }, [fetchSettings]);

  const handleSave = async () => {
    try {
      await supabase.from('system_settings').upsert({
        key: 'general',
        value: {
          payment: { payee_name: payeeName, upi_id: upiId, currency_code: "INR" },
          system_user: { name: adminName, pin: pin }
        }
      });

      if (pin && pin.length >= 6) {
        const { error: authError } = await supabase.auth.updateUser({ password: pin });
        if (authError) throw authError;
      }

      const { data: autoData } = await supabase.from('system_settings').select('value').eq('key', 'automation').maybeSingle();
      const existingAuto = (autoData?.value as T.AutomationSettings) || { lastRouteReset: '', lastBillGeneration: '' };
      await supabase.from('system_settings').upsert({
        key: 'automation',
        value: {
          ...existingAuto,
          autoCloseEnabled,
          morningCloseTime,
          eveningCloseTime
        }
      });

      setIsSaved(true);
      setPin("");
      setTimeout(() => setIsSaved(false), 2000);
    } catch (e: unknown) {
      const err = e as Error;
      console.error("Failed to save settings:", err.message);
    }
  };

  const addRoute = async () => {
    const name = newRoute.trim();
    if (!name || isAddingRoute) return;

    setIsAddingRoute(true);
    try {
      const { data, error } = await supabase.from('areas').insert({ name }).select().single();
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
    try {
      const { error } = await supabase.from('areas').delete().eq('id', id);
      if (error) throw error;
      setAreas(prev => prev.filter(a => a.id !== id));
    } catch (e: unknown) {
      const err = e as Error;
      console.error("Failed to remove route:", err.message);
    }
  };

  const handleLogout = async () => {
    await logout();
    document.cookie = "milkow_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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
    areas,
    newRoute,
    setNewRoute,
    isAddingRoute,
    routeSuccess,
    listEndRef,
    handleSave,
    addRoute,
    removeRoute,
    handleLogout,
    fetchSettings
  };
}
