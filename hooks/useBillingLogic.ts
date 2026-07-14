import { useState, useEffect, useRef, useCallback } from "react";
import config from "@/config.json";
import QRCode from "qrcode";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import * as T from "@/types/database";
import { recordPayment, settleAllDues } from "@/lib/financials";

export function useBillingLogic(qrRef: React.RefObject<HTMLDivElement | null>) {
   const { franchiseId, impersonatedFranchiseId, role } = useAuth();
   const activeFranchiseId = role === 'superadmin' ? ((impersonatedFranchiseId || franchiseId || '00000000-0000-0000-0000-000000000000')) : (franchiseId || '00000000-0000-0000-0000-000000000000');

   const [bills, setBills] = useState<(T.Bill & { customer: T.Customer })[]>([]);
   const [products, setProducts] = useState<T.Product[]>([]);
   const [routesList, setRoutesList] = useState<T.Area[]>([]);
   const [paymentSettings, setPaymentSettings] = useState<T.PaymentSetup | null>(null);
   const [paytmSettings, setPaytmSettings] = useState<any>(null);
   const [isLoading, setIsLoading] = useState(true);
   const [isShareLoading, setIsShareLoading] = useState(false);
   const [showToast, setShowToast] = useState(false);
   const [modalConfig, setModalConfig] = useState<{
      isOpen: boolean;
      title: string;
      message: string;
      onConfirm: (dontShowAgain?: boolean) => void;
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

   const isSubmitting = useRef(false);

   const fetchData = useCallback(async (silent = false) => {
      if (!silent) setIsLoading(true);
      const [
         { data: routeSets },
         { data: financialsData },
         { data: productList },
         { data: unbilledData },
         { data: settingsData },
         { data: paytmData },
         { data: customersData }
      ] = await Promise.all([
         supabase.from('areas').select('*').eq('franchise_id', activeFranchiseId).order('name', { ascending: true }),
         supabase.from('customer_financials').select('*').eq('franchise_id', activeFranchiseId),
         supabase.from('products').select('*').eq('franchise_id', activeFranchiseId),
         supabase.from('deliveries').select('*, customers(*)').eq('franchise_id', activeFranchiseId).eq('delivered', true).eq('billed', false),
         supabase.from('system_settings').select('value').eq('franchise_id', activeFranchiseId).eq('key', 'general').maybeSingle(),
         supabase.from('system_settings').select('value').eq('franchise_id', activeFranchiseId).eq('key', 'paytm').maybeSingle(),
         supabase.from('customers').select('id, phone').eq('franchise_id', activeFranchiseId)
      ]);

      if (routeSets) setRoutesList(routeSets as T.Area[]);

      const prods = (productList || []) as T.Product[];
      setProducts(prods);

      const customersMap = new Map((customersData || []).map((c: any) => [c.id, c]));

      const combinedBills: (T.Bill & { customer: T.Customer })[] = [];
      (financialsData || []).forEach((fin: any) => {
         const grandTotal = fin.current_balance;
         const cDetail = customersMap.get(fin.id) as any;

         if (grandTotal > 0) {
            combinedBills.push({
               id: `TOTAL-${fin.id.slice(0, 8)}`,
               customer_id: fin.id,
               amount: grandTotal,
               type: 'Ledger' as any,
               status: 'Pending',
               created_at: new Date().toISOString(),
               customer: {
                  id: fin.id,
                  name: fin.name,
                  phone: cDetail?.phone || null,
                  area_id: fin.area_id || null
               } as any
            });
         }
      });

      setBills(combinedBills);

      let pSettings: T.PaymentSetup | undefined = undefined;
      if (settingsData) {
         const general = settingsData.value as { payment?: T.PaymentSetup };
         if (general?.payment) {
            pSettings = general.payment;
            setPaymentSettings(general.payment);
         }
      }

      let ptSettings: any = null;
      if (paytmData) {
         ptSettings = paytmData.value;
         setPaytmSettings(ptSettings);
      }

      const pageCacheKey = `milkow_billing_page_${activeFranchiseId}`;
      const pageCacheData = {
         routesList: routeSets || [],
         products: prods,
         bills: combinedBills,
         paymentSettings: pSettings,
         paytmSettings: ptSettings
      };
      localStorage.setItem(pageCacheKey, JSON.stringify(pageCacheData));

      setIsLoading(false);
   }, [activeFranchiseId]);

   useEffect(() => {
      // Attempt to load full page state from cache first for instant render
      const pageCacheKey = `milkow_billing_page_${activeFranchiseId}`;
      const cachedPage = localStorage.getItem(pageCacheKey);

      if (cachedPage) {
         try {
            const parsed = JSON.parse(cachedPage);
            if (parsed.routesList) setRoutesList(parsed.routesList);
            if (parsed.products) setProducts(parsed.products);
            if (parsed.bills) setBills(parsed.bills);
            if (parsed.paymentSettings) setPaymentSettings(parsed.paymentSettings);
            if (parsed.paytmSettings) setPaytmSettings(parsed.paytmSettings);
            setIsLoading(false);
         } catch (e) { }
      }

      fetchData(!!cachedPage);

      const sub = supabase.channel('bills_page')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'bills', filter: `franchise_id=eq.${activeFranchiseId}` }, () => fetchData(true))
         .on('postgres_changes', { event: '*', schema: 'public', table: 'customers', filter: `franchise_id=eq.${activeFranchiseId}` }, () => fetchData(true))
         .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries', filter: `franchise_id=eq.${activeFranchiseId}` }, () => fetchData(true))
         .on('postgres_changes', { event: '*', table: 'payments', filter: `franchise_id=eq.${activeFranchiseId}` }, () => fetchData(true))
         .subscribe();

      return () => { sub.unsubscribe(); };
   }, [activeFranchiseId, fetchData]);

   const runMarkAsPaid = async (id: string, setSelectedInvoice: (val: null) => void) => {
      if (isSubmitting.current) return;

      const entry = bills.find(b => b.id === id);
      if (!entry) return;

      isSubmitting.current = true;

      // Optimistic UI Update: remove bill from list instantly
      setBills(prev => prev.filter(b => b.id !== id));
      setSelectedInvoice(null);

      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);

      // Background DB call
      settleAllDues(entry.customer_id, 'Cash', 'Full Settlement from Billing')
         .then(() => {
            fetchData(true);
         })
         .catch((err) => {
            console.error("Failed to mark as paid:", err);
            // Revert on failure by fetching actual data
            fetchData(true);
         })
         .finally(() => {
            isSubmitting.current = false;
         });
   };

   const handleMarkAsPaid = (id: string, setSelectedInvoice: (val: null) => void) => {
      const skip = localStorage.getItem('skip_billing_confirm') === 'true';
      if (skip) {
         runMarkAsPaid(id, setSelectedInvoice);
         return;
      }

      const entry = bills.find(b => b.id === id);
      if (!entry) return;

      setModalConfig({
         isOpen: true,
         title: "Confirm Payment",
         message: `Mark the full balance of ₹${Number(entry.amount).toFixed(2)} for ${entry.customer?.name} as paid in cash?`,
         type: 'success',
         confirmText: "Yes, Mark Paid",
         showDontShowAgain: true,
         onConfirm: (dontShow) => {
            if (dontShow) localStorage.setItem('skip_billing_confirm', 'true');
            setModalConfig(prev => ({ ...prev, isOpen: false }));
            runMarkAsPaid(id, setSelectedInvoice);
         }
      });
   };

   const getPaymentCardFile = async (invoice: T.Bill & { customer: T.Customer }) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      const width = 1080;
      const height = 1920;
      canvas.width = width;
      canvas.height = height;

      const bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, "#050044");
      bgGradient.addColorStop(1, "#020024");
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(width * 0.9, height * 0.1, 500, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(width * 0.1, height * 0.9, 400, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1.0;

      const cardX = 80;
      const cardY = 120;
      const cardW = width - 160;
      const cardH = 1600;
      const radius = 80;

      ctx.shadowColor = "rgba(0,0,0,0.4)";
      ctx.shadowBlur = 60;
      ctx.shadowOffsetY = 30;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, radius);
      ctx.fill();
      ctx.shadowColor = "transparent";

      const logo = new Image();
      logo.crossOrigin = "anonymous";
      logo.src = "/assets/logo.svg";
      await new Promise((resolve) => { logo.onload = resolve; logo.onerror = resolve; });
      if (logo.complete && logo.naturalWidth > 0) {
         const logoWidth = 260;
         const logoHeight = logo.naturalHeight * (logoWidth / logo.naturalWidth);
         ctx.drawImage(logo, (width / 2) - (logoWidth / 2), cardY + 80, logoWidth, logoHeight);
      }

      ctx.fillStyle = "#94A3B8";
      ctx.font = "500 36px Geist, Inter, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TOTAL PAYABLE", width / 2, cardY + 300);

      ctx.fillStyle = "#050044";
      ctx.font = "900 120px Geist, Inter, sans-serif";
      const formattedAmount = `₹${Number(invoice.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      ctx.fillText(formattedAmount, width / 2, cardY + 440);

      ctx.strokeStyle = "#F1F5F9";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cardX + 100, cardY + 540);
      ctx.lineTo(cardX + cardW - 100, cardY + 540);
      ctx.stroke();

      ctx.textAlign = "left";
      ctx.fillStyle = "#64748B";
      ctx.font = "bold 30px Geist, Inter, sans-serif";
      ctx.fillText("BILL TO", cardX + 100, cardY + 620);

      ctx.fillStyle = "#1E293B";
      ctx.font = "900 50px Geist, Inter, sans-serif";
      ctx.fillText(invoice.customer?.name || "Customer", cardX + 100, cardY + 695);

      const phone = invoice.customer?.phone || "";
      const routeId = invoice.customer?.area_id;
      const routeName = routesList.find(r => r.id === routeId)?.name || "";

      let detailsText = "";
      if (phone && routeName) {
         detailsText = `${phone}   ·   ${routeName}`;
      } else {
         detailsText = phone || routeName || "";
      }

      if (detailsText) {
         ctx.fillStyle = "#64748B";
         ctx.font = "600 32px Geist, Inter, sans-serif";
         ctx.fillText(detailsText, cardX + 100, cardY + 760);
      }

      const qrSize = 540;
      const qrX = (width / 2) - (qrSize / 2);
      const qrY = cardY + 840;

      ctx.fillStyle = "#F8FAFC";
      ctx.beginPath();
      ctx.roundRect(qrX - 40, qrY - 40, qrSize + 80, qrSize + 80, 60);
      ctx.fill();

      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Generate QR code directly onto an offscreen canvas — no DOM dependency,
      // no tainted-canvas issues from embedded SVG logos.

      //f2
      if (paymentSettings) {
         // 1. Fixed: Extracted float values and locked to 2 decimals
         const amount = Number(invoice.amount).toFixed(2);
         const payeeName = encodeURIComponent(paymentSettings.payee_name);

         // 2. Constructed valid compliant P2P URI structure
         const upiValue = `upi://pay?pa=${paymentSettings.upi_id}&pn=${payeeName}&am=${amount}&cu=INR&tn=Dairy%20Bill`;

         const qrOffscreen = document.createElement("canvas");
         await QRCode.toCanvas(qrOffscreen, upiValue, {
            width: qrSize,
            margin: 2,
            errorCorrectionLevel: "H",
            color: { dark: "#000000", light: "#FFFFFF" },
         });
         ctx.drawImage(qrOffscreen, qrX, qrY, qrSize, qrSize);
      }

      ctx.textAlign = "center";
      ctx.fillStyle = "#050044";
      ctx.font = "bold 38px Geist, Inter, sans-serif";
      ctx.fillText("Scan with any UPI App", width / 2, cardY + 1475);

      if (paymentSettings?.upi_id) {
         ctx.fillStyle = "#64748B";
         ctx.font = "600 30px Geist, Inter, sans-serif";
         ctx.fillText(`UPI ID: ${paymentSettings.upi_id}`, width / 2, cardY + 1535);
      }

      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "bold 32px Geist, Inter, sans-serif";
      ctx.fillText("Fresh Milk, Delivered with Love.", width / 2, 1860);

      // Use toBlob() — faster than fetch(dataUrl) and avoids an extra async hop
      // that could invalidate the browser's user-gesture token before navigator.share() runs.
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png", 0.95));
      if (!blob) return null;
      return new File([blob], `Milkow_Bill_${invoice.customer?.name}.png`, { type: "image/png" });
   };

   const handleShareCard = async (selectedInvoice: (T.Bill & { customer: T.Customer }) | null) => {
      if (!selectedInvoice || isShareLoading) return;
      setIsShareLoading(true);
      try {
         const file = await getPaymentCardFile(selectedInvoice);
         if (!file) throw new Error("Failed to generate payment card.");

         if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            // navigator.share requires being called as close to the user gesture as possible.
            // toBlob() is the fastest path to get the File, keeping the gesture token alive.
            await navigator.share({
               files: [file],
               title: `Payment Card for ${selectedInvoice.customer?.name}`,
               text: `Hi ${selectedInvoice.customer?.name}, please pay ₹${Number(selectedInvoice.amount).toFixed(2)} via the QR.`,
            });
         } else {
            // Fallback: trigger a download. Must append to DOM for Firefox/Safari.
            const objectUrl = URL.createObjectURL(file);
            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = `Milkow_Card_${selectedInvoice.customer?.name}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
         }
      } catch (e: any) {
         // "AbortError" means the user dismissed the share sheet — not a real error.
         if (e?.name !== "AbortError") {
            console.error("Share card error:", e);
            setModalConfig({
               isOpen: true,
               title: "Share Failed",
               message: "Could not share the payment card. Try again or screenshot the QR directly.",
               type: "danger",
               onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
               confirmText: "OK",
            });
         }
      } finally {
         setIsShareLoading(false);
      }
   };
   //f1
   const handleWhatsAppShare = async (invoice: (T.Bill & { customer: T.Customer })) => {
      if (!paymentSettings) return;

      // 1. Strict formatting alignment
      const amount = Number(invoice.amount).toFixed(2);
      const payeeName = encodeURIComponent(paymentSettings.payee_name);

      // 2. Added &pn and sanitized transaction note string
      const upiLink = `upi://pay?pa=${paymentSettings.upi_id}&pn=${payeeName}&am=${amount}&cu=INR&tn=Dairy%20Bill`;
      const message = `Hi ${invoice.customer?.name}, your total outstanding bill is ₹${amount}. Please scan the UPI QR or pay via: ${upiLink}`;

      // 3. Normalize phone number properties
      const digitsOnly = (invoice.customer?.phone || "").replace(/\D/g, "");
      const e164 = digitsOnly.length > 10 ? digitsOnly : `91${digitsOnly}`;
      const url = `https://wa.me/${e164}?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank");
   };

   return {
      bills,
      routesList,
      paymentSettings,
      paytmSettings,
      isLoading,
      isShareLoading,
      showToast,
      modalConfig,
      setModalConfig,
      setIsLoading,
      fetchData,
      handleMarkAsPaid,
      handleShareCard,
      handleWhatsAppShare,
      activeFranchiseId
   };
}
