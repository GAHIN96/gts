import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, x-login-success",
};

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;
const RATE_LIMIT_WINDOW_MINUTES = 15;
// Max failed attempts from a single IP for a specific email before blocking
const MAX_IP_EMAIL_ATTEMPTS = 3;
// Global IP rate limit across all emails
const MAX_IP_GLOBAL_ATTEMPTS = 5;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { action, email, ip_address, user_agent, user_id } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(
        JSON.stringify({ error: "Invalid request" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (action === "check_rate_limit") {
      // Check if account is locked
      const { data: lockout } = await supabase
        .from("account_lockouts")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("is_active", true)
        .single();

      if (lockout && new Date(lockout.locked_until) > new Date()) {
        const minutesLeft = Math.ceil(
          (new Date(lockout.locked_until).getTime() - Date.now()) / 60000
        );
        return new Response(
          JSON.stringify({
            allowed: false,
            reason: "account_locked",
            minutes_remaining: minutesLeft,
            message: `Account is locked. Try again in ${minutesLeft} minutes.`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Auto-unlock expired lockouts
      if (lockout && new Date(lockout.locked_until) <= new Date()) {
        await supabase
          .from("account_lockouts")
          .update({ is_active: false, unlocked_at: new Date().toISOString() })
          .eq("id", lockout.id);
      }

      // Count recent failed attempts
      const windowStart = new Date(
        Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60000
      ).toISOString();
      const { count } = await supabase
        .from("login_attempts")
        .select("*", { count: "exact", head: true })
        .eq("email", normalizedEmail)
        .eq("success", false)
        .gte("created_at", windowStart);

      const attemptsLeft = MAX_ATTEMPTS - (count || 0);

      return new Response(
        JSON.stringify({
          allowed: attemptsLeft > 0,
          attempts_remaining: Math.max(0, attemptsLeft),
          reason: attemptsLeft <= 0 ? "rate_limited" : null,
          message:
            attemptsLeft <= 0
              ? "Too many failed attempts. Please wait before trying again."
              : null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "record_attempt") {
      const callerIp = ip_address || req.headers.get("x-forwarded-for") || "unknown";
      const ipWindowStart = new Date(
        Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60000
      ).toISOString();

      // 1. Global IP rate limit — prevent any single IP from flooding the system
      if (callerIp !== "unknown") {
        const { count: ipGlobalCount } = await supabase
          .from("login_attempts")
          .select("*", { count: "exact", head: true })
          .eq("ip_address", callerIp)
          .eq("success", false)
          .gte("created_at", ipWindowStart);

        if ((ipGlobalCount || 0) >= MAX_IP_GLOBAL_ATTEMPTS) {
          return new Response(
            JSON.stringify({ error: "Too many requests from this IP" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // 2. Per-IP per-email rate limit — prevent a single IP from locking out a specific account
      if (callerIp !== "unknown") {
        const { count: ipEmailCount } = await supabase
          .from("login_attempts")
          .select("*", { count: "exact", head: true })
          .eq("ip_address", callerIp)
          .eq("email", normalizedEmail)
          .eq("success", false)
          .gte("created_at", ipWindowStart);

        if ((ipEmailCount || 0) >= MAX_IP_EMAIL_ATTEMPTS) {
          return new Response(
            JSON.stringify({ error: "Too many attempts for this account from your location" }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const { success: bodySuccess } = await req.clone().json().catch(() => ({}));
      const success = bodySuccess !== undefined ? bodySuccess : req.headers.get("x-login-success") === "true";

      // For successful login recording, require a valid JWT to prevent spoofing
      if (success) {
        const authHeader = req.headers.get("Authorization");
        if (authHeader) {
          const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
          const userClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: authHeader } },
          });
          const { data: { user: authUser }, error: authError } = await userClient.auth.getUser();
          if (authError || !authUser) {
            return new Response(
              JSON.stringify({ error: "Authentication required for this action" }),
              { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          // Ensure the recorded email matches the authenticated user
          if (authUser.email?.toLowerCase() !== normalizedEmail) {
            return new Response(
              JSON.stringify({ error: "Email mismatch" }),
              { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      // Record the attempt
      await supabase.from("login_attempts").insert({
        email: normalizedEmail,
        ip_address: callerIp,
        user_agent,
        success,
        failure_reason: success ? null : "invalid_credentials",
      });

      if (!success) {
        // Count recent failures across ALL IPs for this email
        const windowStart = new Date(
          Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60000
        ).toISOString();
        const { count } = await supabase
          .from("login_attempts")
          .select("*", { count: "exact", head: true })
          .eq("email", normalizedEmail)
          .eq("success", false)
          .gte("created_at", windowStart);

        // Only lock account if failures come from multiple distinct IPs
        // A single IP is already rate-limited to MAX_IP_EMAIL_ATTEMPTS (3)
        // So lockout requires distributed failures, which indicates a real brute force
        if ((count || 0) >= MAX_ATTEMPTS) {
          // Count distinct IPs that contributed failures
          const { data: recentFailures } = await supabase
            .from("login_attempts")
            .select("ip_address")
            .eq("email", normalizedEmail)
            .eq("success", false)
            .gte("created_at", windowStart);

          const distinctIPs = new Set(
            (recentFailures || []).map((r: any) => r.ip_address)
          );

          // Only lock if failures come from 2+ IPs (real distributed attack)
          // OR if the single IP has been rate-limited (shouldn't reach here but safety check)
          if (distinctIPs.size >= 2) {
            const lockedUntil = new Date(
              Date.now() + LOCKOUT_MINUTES * 60000
            ).toISOString();

            await supabase.from("account_lockouts").upsert(
              {
                email: normalizedEmail,
                locked_until: lockedUntil,
                failure_count: count || 0,
                is_active: true,
                locked_at: new Date().toISOString(),
              },
              { onConflict: "email" }
            );

            // Create security alert
            await supabase.from("security_alerts").insert({
              alert_type: "account_locked",
              severity: "high",
              email: normalizedEmail,
              description: `Account locked after ${count} failed login attempts from ${distinctIPs.size} IPs`,
              metadata: { ip_address: callerIp, user_agent, failure_count: count, distinct_ips: distinctIPs.size },
            });

            return new Response(
              JSON.stringify({
                locked: true,
                message: `Account locked for ${LOCKOUT_MINUTES} minutes due to repeated failed attempts.`,
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
        }
      }

      // On successful login, record session and check for suspicious activity
      if (success && user_id) {
        const deviceInfo = user_agent
          ? user_agent.substring(0, 100)
          : "Unknown";

        const { data: recentSessions } = await supabase
          .from("user_sessions")
          .select("ip_address, user_agent")
          .eq("user_id", user_id)
          .order("logged_in_at", { ascending: false })
          .limit(5);

        let isSuspicious = false;
        let suspiciousReason = null;

        if (recentSessions && recentSessions.length > 0) {
          const knownIPs = new Set(recentSessions.map((s: any) => s.ip_address));
          if (callerIp && !knownIPs.has(callerIp) && knownIPs.size >= 2) {
            isSuspicious = true;
            suspiciousReason = `Login from new IP address: ${callerIp}`;
          }
        }

        await supabase.from("user_sessions").insert({
          user_id,
          email: normalizedEmail,
          ip_address: callerIp,
          user_agent,
          device_info: deviceInfo,
          is_suspicious: isSuspicious,
          suspicious_reason: suspiciousReason,
        });

        if (isSuspicious) {
          await supabase.from("security_alerts").insert({
            alert_type: "suspicious_login",
            severity: "medium",
            email: normalizedEmail,
            user_id,
            description: suspiciousReason,
            metadata: { ip_address: callerIp, user_agent },
          });
        }
      }

      return new Response(
        JSON.stringify({ recorded: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "unlock_account") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: { user: adminUser } } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      if (!adminUser) {
        return new Response(
          JSON.stringify({ error: "Unauthorized" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", adminUser.id)
        .single();

      if (!roleData || roleData.role !== "admin") {
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await supabase
        .from("account_lockouts")
        .update({
          is_active: false,
          unlocked_by: adminUser.id,
          unlocked_at: new Date().toISOString(),
        })
        .eq("email", normalizedEmail)
        .eq("is_active", true);

      return new Response(
        JSON.stringify({ unlocked: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "An internal error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
