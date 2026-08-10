import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role key - bypasses all RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get all users from auth and ensure they have admin role
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      throw new Error("Failed to list users: " + usersError.message);
    }

    const results = [];

    for (const user of users) {
      // Check if user already has admin role
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("*")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!existingRole) {
        // Add admin role
        const { error: insertError } = await supabaseAdmin
          .from("user_roles")
          .insert({ user_id: user.id, role: "admin" });
        
        results.push({
          email: user.email,
          userId: user.id,
          action: insertError ? "failed: " + insertError.message : "added admin role"
        });
      } else {
        results.push({
          email: user.email,
          userId: user.id,
          action: "already has admin role"
        });
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: "Admin roles updated for all users",
      results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
