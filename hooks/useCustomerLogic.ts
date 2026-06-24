import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import * as T from "@/types/database";
// import { toPng } from "html-to-image"; // commented out — long screenshot setup
import { recordPayment, settleAllDues/*, recordReturn*/ } from "@/lib/financials"; // recordReturn commented out — Return Item disabled

export function useCustomerLogic(
   customerIdParam: string,
   screenshotRef: React.RefObject<HTMLDivElement | null>
) {
   const router = useRouter();
   const [customer, setCustomer] = useState<(T.Customer & { area: T.Area }) | null>(null);
   const [financials, setFinancials] = useState<T.CustomerFinancials | null>(null);
   const [isCapturing, setIsCapturing] = useState(false);
   const [bills, setBills] = useState<T.Bill[]>([]);
   const [deliveries, setDeliveries] = useState<T.Delivery[]>([]);
   const [allUnbilledDeliveries, setAllUnbilledDeliveries] = useState<T.Delivery[]>([]);
   const [payments, setPayments] = useState<T.Payment[]>([]);
   const [products, setProducts] = useState<T.Product[]>([]);
   const [isLoading, setIsLoading] = useState(true);
   const [viewDate, setViewDate] = useState(new Date());
   const [areas, setAreas] = useState<T.Area[]>([]);
   const [editForm, setEditForm] = useState({ 
      name: "", phone: "", area_id: "", frequency: "Morning Only", 
      outstanding: "", outstanding_type: "credit", 
      default_product_id: "", default_qty: "1" 
   });

   const [isSubmitting, setIsSubmitting] = useState(false);

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
      type: 'info',
      showDontShowAgain: false
   });

   const fetchData = useCallback(async (silent = false) => {
      if (!customerIdParam) return;
      if (!silent) setIsLoading(true);
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(new Date(year, month + 1, 0).getDate()).padStart(2, '0')}`;

      const [
         { data: custData },
         { data: areaList },
         { data: billsData },
         { data: deliveryData },
         { data: unbilledData },
         { data: paymentData },
         { data: productData },
         { data: finData }
      ] = await Promise.all([
         supabase.from('customers').select('*, area:areas(*)').eq('id', customerIdParam).single(),
         supabase.from('areas').select('*').order('name', { ascending: true }),
         supabase.from('bills').select('*').eq('customer_id', customerIdParam).order('created_at', { ascending: false }),
         supabase.from('deliveries').select('*').eq('customer_id', customerIdParam).gte('delivery_date', monthStart).lte('delivery_date', monthEnd).order('delivery_date', { ascending: true }),
         supabase.from('deliveries').select('*').eq('customer_id', customerIdParam).eq('delivered', true).eq('billed', false),
         supabase.from('payments').select('*').eq('customer_id', customerIdParam).order('payment_date', { ascending: false }),
         supabase.from('products').select('*'),
         supabase.from('customer_financials').select('*').eq('id', customerIdParam).single()
      ]);

      if (areaList) setAreas(areaList as T.Area[]);
      if (billsData) setBills(billsData as T.Bill[]);
      if (deliveryData) setDeliveries(deliveryData as T.Delivery[]);
      if (unbilledData) setAllUnbilledDeliveries(unbilledData as T.Delivery[]);
      if (paymentData) setPayments(paymentData as T.Payment[]);
      if (productData) setProducts(productData as T.Product[]);
      if (finData) setFinancials(finData as T.CustomerFinancials);

      if (custData) {
         setCustomer(custData as (T.Customer & { area: T.Area }));
         const outstandingVal = parseFloat(custData.past_outstanding?.toString() || "0");
         setEditForm({
            name: custData.name,
            phone: custData.phone,
            area_id: custData.area_id?.toString() || "",
            frequency: custData.frequency,
            outstanding: Math.abs(outstandingVal).toString(),
            outstanding_type: outstandingVal < 0 ? "advance" : "credit",
            default_product_id: custData.default_product_id?.toString() || "",
            default_qty: custData.default_qty?.toString() || "1"
         });
      }
      if (!silent) setIsLoading(false);
   }, [customerIdParam, viewDate]);

   useEffect(() => {
      fetchData();

      const sub = supabase.channel('cust_profile')
         .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => fetchData(true))
         .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => fetchData(true))
         .on('postgres_changes', { event: '*', schema: 'public', table: 'deliveries' }, () => fetchData(true))
         .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => fetchData(true))
         .subscribe();

      return () => { sub.unsubscribe(); };
   }, [fetchData]);

   const prices: Record<string, number> = {};
   products.forEach(p => prices[p.name] = Number(p.price));
   const milkPrice = prices[Object.keys(prices).find(n => n.toLowerCase().includes('milk')) || ''] || 50;

   const calculateDeliveryTotal = (d: T.Delivery & { total_cost?: number }) => {
      if (d.total_cost != null && d.total_cost > 0) return Number(d.total_cost);

      const product = products.find(p => p.id === d.product_id);
      const basePrice = product ? Number(product.price) : milkPrice;
      let total = (Number(d.milk_qty) || 0) * basePrice;
      const extras = d.misc_items || [];
      extras.forEach((item: any) => {
         const itemPrice = prices[item.name] || 0;
         total += (item.qty || 0) * itemPrice;
      });
      return total;
   };

   const unbilledDeliveries = deliveries.filter(d => d.delivered && !d.billed);
   const currentDeliveriesAmount = unbilledDeliveries.reduce((acc, d) => acc + calculateDeliveryTotal(d), 0);

   const grandTotalAmount = financials?.current_balance || 0;
   const billsBalance = grandTotalAmount - currentDeliveriesAmount;

   const toggleStatus = async () => {
      if (!customer) return;
      const newStatus = customer.status === 'Active' ? 'Inactive' : 'Active';
      
      // Optimistic update
      setCustomer({ ...customer, status: newStatus });
      
      try {
         supabase.from('customers').update({ status: newStatus }).eq('id', customer.id)
            .then(() => fetchData(true))
            .catch((err: any) => {
               console.error(err);
               fetchData(true); // Revert on error
            });
      } catch (err) { 
         console.error(err);
         fetchData(true);
      }
   };

   const deleteCustomer = async () => {
      if (!customer) return;
      try {
         setIsLoading(true);
         await supabase.from('customers').delete().eq('id', customer.id);
         router.push('/customers');
      } catch (err) { console.error(err); setIsLoading(false); }
   };

   const handleEditSubmit = async (e: React.FormEvent, setIsEditModalOpen: (v: boolean) => void) => {
      e.preventDefault();
      if (!customer || !editForm.name || !editForm.phone || !editForm.area_id || isSubmitting) return;
      setIsSubmitting(true);
      
      const amt = parseFloat(editForm.outstanding) || 0;
      const finalOutstanding = editForm.outstanding_type === "advance" ? -Math.abs(amt) : Math.abs(amt);
      
      const userChangedOutstanding = finalOutstanding !== Number(customer.past_outstanding);
      
      const updatePayload: any = {
         name: editForm.name,
         phone: editForm.phone,
         area_id: parseInt(editForm.area_id),
         frequency: editForm.frequency,
         default_product_id: editForm.default_product_id || null,
         default_qty: parseInt(editForm.default_qty) || 1
      };
      
      if (userChangedOutstanding) {
         updatePayload.past_outstanding = finalOutstanding;
      }

      // Optimistic update
      const newArea = areas.find(a => a.id === updatePayload.area_id) || customer.area;
      setCustomer({ ...customer, ...updatePayload, area: newArea });
      setIsEditModalOpen(false);
      
      try {
         supabase.from('customers').update(updatePayload).eq('id', customer.id)
            .then(() => fetchData(true))
            .catch((err: any) => {
               console.error(err);
               fetchData(true); // Revert on failure
            })
            .finally(() => setIsSubmitting(false));
      } catch (err) {
         console.error(err);
         fetchData(true);
         setIsSubmitting(false);
      }
   };

   const runMarkAsPaid = async () => {
      if (!customer || grandTotalAmount <= 0 || isSubmitting) return;
      setIsSubmitting(true);
      
      // Optimistic Update
      if (financials) {
         setFinancials({ ...financials, current_balance: 0 });
      }
      setBills(prev => prev.map(b => ({ ...b, status: 'Paid' })));
      
      setModalConfig({
         isOpen: true,
         title: "Payment Recorded",
         message: "Payment has been recorded and all dues have been settled successfully!",
         type: 'success',
         onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
         confirmText: "Great"
      });

      try {
         settleAllDues(customer.id, 'Cash', 'Full Settlement from Profile')
            .then(() => fetchData(true))
            .catch((err: any) => {
               console.error("Failed to mark as paid:", err);
               fetchData(true); // Revert on failure
            })
            .finally(() => setIsSubmitting(false));
      } catch (err) {
         console.error("Failed to trigger mark as paid:", err);
         fetchData(true);
         setIsSubmitting(false);
      }
   };

   const handleMarkAsPaid = () => {
      const skip = localStorage.getItem('skip_payment_confirm') === 'true';
      if (skip) {
         runMarkAsPaid();
         return;
      }

      setModalConfig({
         isOpen: true,
         title: "Settle Payment",
         message: `Mark the full balance of ₹${Math.abs(grandTotalAmount).toFixed(2)} as paid in cash?`,
         type: 'success',
         confirmText: "Settle Now",
         showDontShowAgain: true,
         onConfirm: (dontShow) => {
            if (dontShow) localStorage.setItem('skip_payment_confirm', 'true');
            setModalConfig(prev => ({ ...prev, isOpen: false }));
            runMarkAsPaid();
         }
      });
   };

   const runRecordPayment = async (amountVal: number, methodVal: string, notesVal: string, setIsPaymentModalOpen: (v: boolean) => void) => {
      if (!customer || isSubmitting) return;
      setIsSubmitting(true);
      
      // Optimistic UI updates
      if (financials) {
         setFinancials({ ...financials, current_balance: financials.current_balance - amountVal });
      }
      
      setIsPaymentModalOpen(false);
      setModalConfig({
         isOpen: true,
         title: "Payment Recorded",
         message: `Successfully recorded payment of ₹${amountVal.toFixed(2)} using ${methodVal}.`,
         type: 'success',
         onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
         confirmText: "Great"
      });

      try {
         recordPayment(customer.id, amountVal, methodVal, notesVal || 'Custom Payment from Profile')
            .then(() => fetchData(true))
            .catch((err: any) => {
               console.error("Failed to record payment:", err);
               fetchData(true); // Revert on failure
            })
            .finally(() => setIsSubmitting(false));
      } catch (err) {
         console.error("Failed to trigger record payment:", err);
         fetchData(true);
         setIsSubmitting(false);
      }
   };

   // ─── handleRecordReturn — commented out (Return Item disabled) ───────────
   // const handleRecordReturn = async (
   //    returnAmount: number,
   //    returnNotes: string,
   //    setIsReturnModalOpen: (v: boolean) => void
   // ) => {
   //    if (!customer || returnAmount <= 0 || isSubmitting) return;
   //    setIsSubmitting(true);
   //    try {
   //       setIsLoading(true);
   //       await recordReturn(customer.id, returnAmount, returnNotes || `Return / Refund`);
   //       await fetchData(true);
   //       setIsReturnModalOpen(false);
   //       setModalConfig({
   //          isOpen: true,
   //          title: "Return Recorded",
   //          message: `₹${returnAmount.toFixed(2)} credit has been added to ${customer.name}'s account as advance.`,
   //          type: 'success',
   //          onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
   //          confirmText: "Great"
   //       });
   //    } catch (err) {
   //       console.error("Failed to record return:", err);
   //       setModalConfig({
   //          isOpen: true,
   //          title: "Return Failed",
   //          message: "Failed to record return. Please try again.",
   //          type: 'danger',
   //          onConfirm: () => setModalConfig(prev => ({ ...prev, isOpen: false })),
   //       });
   //    } finally {
   //       setIsSubmitting(false);
   //       setIsLoading(false);
   //    }
   // };
   // ─────────────────────────────────────────────────────────────────────────

   const changeMonth = (delta: number) => {
      const newDate = new Date(viewDate);
      newDate.setMonth(newDate.getMonth() + delta);
      setViewDate(newDate);
   };
   
   const monthName = viewDate.toLocaleString('default', { month: 'long' });
   const yearName = viewDate.getFullYear();

   // ─── Long Screenshot Setup (commented out) ───────────────────────────────
   // const handleCaptureScreenshot = async () => {
   //    if (!screenshotRef.current || !customer) return;
   //    setIsCapturing(true);
   //    try {
   //       const balanceText = grandTotalAmount > 0
   //          ? `Outstanding Balance: ₹${grandTotalAmount.toFixed(2)}`
   //          : `Advance Balance: ₹${Math.abs(grandTotalAmount).toFixed(2)}`;
   //       const message = `Hi ${customer.name}, here is your delivery ledger and statement for ${monthName} ${yearName}.\n${balanceText}`;
   //
   //       const openWhatsApp = (msg: string) => {
   //          const phoneNum = customer.phone || "";
   //          const cleanPhone = phoneNum.replace(/[^0-9]/g, "");
   //          const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
   //          const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
   //          window.open(url, "_blank");
   //       };
   //
   //       const generateBlob = async () => {
   //          const dataUrl = await toPng(screenshotRef.current!, {
   //             quality: 0.95,
   //             backgroundColor: "#f8fafc",
   //             style: {
   //                height: "auto",
   //                overflow: "visible",
   //             },
   //          });
   //          return await (await fetch(dataUrl)).blob();
   //       };
   //
   //       let shared = false;
   //       if (navigator.share && navigator.canShare) {
   //          try {
   //             const blob = await generateBlob();
   //             const fileName = `Milkow_Profile_${customer.name.replace(/\s+/g, '_')}_${monthName}_${yearName}.png`;
   //             const file = new File([blob], fileName, { type: "image/png" });
   //
   //             if (navigator.canShare({ files: [file] })) {
   //                await navigator.share({
   //                   files: [file],
   //                   title: `${customer.name} Statement`,
   //                   text: message,
   //                });
   //                shared = true;
   //             }
   //          } catch (shareErr) {
   //             console.warn("Native share failed, trying clipboard:", shareErr);
   //          }
   //       }
   //
   //       if (!shared) {
   //          let clipboardCopied = false;
   //          try {
   //             if (navigator.clipboard && window.ClipboardItem) {
   //                const blobPromise = generateBlob();
   //                await navigator.clipboard.write([
   //                   new ClipboardItem({
   //                      "image/png": blobPromise
   //                   })
   //                ]);
   //                clipboardCopied = true;
   //             }
   //          } catch (clipErr) {
   //             console.warn("Clipboard copy failed, falling back to download:", clipErr);
   //          }
   //
   //          if (clipboardCopied) {
   //             setModalConfig({
   //                isOpen: true,
   //                title: "Copied to Clipboard",
   //                message: `The ledger statement has been copied to your clipboard. WhatsApp will open now—simply paste (Ctrl+V or long-press paste) to share the image.`,
   //                type: 'success',
   //                confirmText: "Open WhatsApp",
   //                onConfirm: () => {
   //                   setModalConfig(prev => ({ ...prev, isOpen: false }));
   //                   openWhatsApp(message);
   //                }
   //             });
   //          } else {
   //             const blob = await generateBlob();
   //             const fileName = `Milkow_Profile_${customer.name.replace(/\s+/g, '_')}_${monthName}_${yearName}.png`;
   //             const fileUrl = URL.createObjectURL(blob);
   //             const link = document.createElement("a");
   //             link.download = fileName;
   //             link.href = fileUrl;
   //             link.click();
   //             URL.revokeObjectURL(fileUrl);
   //
   //             setModalConfig({
   //                isOpen: true,
   //                title: "Statement Downloaded",
   //                message: `The statement image has been downloaded. WhatsApp will open now—please attach the downloaded image manually.`,
   //                type: 'info',
   //                confirmText: "Open WhatsApp",
   //                onConfirm: () => {
   //                   setModalConfig(prev => ({ ...prev, isOpen: false }));
   //                   openWhatsApp(message);
   //                }
   //             });
   //          }
   //       }
   //    } catch (err) {
   //       console.error("Screenshot capture and share failed:", err);
   //    } finally {
   //       setIsCapturing(false);
   //    }
   // };
   // ─────────────────────────────────────────────────────────────────────────
   const handleCaptureScreenshot = async () => { /* screenshot disabled */ };

   return {
      customer,
      financials,
      bills,
      currentDeliveriesAmount,
      billsBalance,
      deliveries,
      allUnbilledDeliveries,
      payments,
      products,
      isLoading,
      viewDate,
      areas,
      editForm,
      setEditForm,
      modalConfig,
      setModalConfig,
      fetchData,
      isCapturing,
      monthName,
      yearName,
      calculateDeliveryTotal,
      grandTotalAmount,
      toggleStatus,
      deleteCustomer,
      handleEditSubmit,
      handleMarkAsPaid,
      runRecordPayment,
      // handleRecordReturn, // Return Item disabled
      changeMonth,
      handleCaptureScreenshot,
      isSubmitting
   };
}
