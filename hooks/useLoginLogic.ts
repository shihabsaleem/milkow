import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function useLoginLogic() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.push("/");
    }
  }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Validate and clean user inputs
    const cleanedEmail = email.trim();
    if (!cleanedEmail || !/^\S+@\S+\.\S+$/.test(cleanedEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    // 2. Implement rate limiting and account lockouts
    const lockoutKey = `lockout_${cleanedEmail}`;
    const attemptsKey = `attempts_${cleanedEmail}`;
    
    const lockoutUntil = localStorage.getItem(lockoutKey);
    if (lockoutUntil && Date.now() < parseInt(lockoutUntil, 10)) {
      const remainingMinutes = Math.ceil((parseInt(lockoutUntil, 10) - Date.now()) / 60000);
      setError(`Account temporarily locked. Please try again in ${remainingMinutes} minute(s).`);
      return;
    } else if (lockoutUntil) {
       localStorage.removeItem(lockoutKey);
       localStorage.removeItem(attemptsKey);
    }

    setIsLoading(true);
    setError("");

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: cleanedEmail,
        password,
      });

      if (authError) throw authError;
      
      localStorage.removeItem(attemptsKey);
      localStorage.removeItem(lockoutKey);
      
      router.push("/");
    } catch (err: any) {
      let attempts = parseInt(localStorage.getItem(attemptsKey) || "0", 10);
      attempts += 1;
      
      if (attempts >= MAX_ATTEMPTS) {
        localStorage.setItem(lockoutKey, (Date.now() + LOCKOUT_DURATION_MS).toString());
        localStorage.setItem(attemptsKey, attempts.toString());
        setError(`Too many failed attempts. Account locked for ${Math.ceil(LOCKOUT_DURATION_MS / 60000)} minutes.`);
      } else {
        localStorage.setItem(attemptsKey, attempts.toString());
        // 3. Fix error message like invalid credential
        const errMsg = err.message?.toLowerCase() || "";
        if (errMsg.includes("invalid login credentials") || errMsg.includes("invalid credential")) {
           setError("Invalid email or password.");
        } else {
           setError("An error occurred during login. Please try again.");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    error,
    handleLogin
  };
}
