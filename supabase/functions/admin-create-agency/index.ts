import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    // Check if requesting user is admin
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .single();

    if (roleError || roleData?.role !== "admin") {
      throw new Error("Only admins can create agencies");
    }

    const body = await req.json();
    const { 
      email, 
      password, 
      fullName, 
      companyName, 
      phone,
      agencyName,
      licenseNumber,
      address,
      city,
      country,
      commissionRate,
      contactPersonName,
      contactEmail,
      contactPhone
    } = body;

    console.log(`Admin ${requestingUser.email} creating agency for: ${email}`);

    // Create user with admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        company_name: companyName,
        phone,
      },
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw new Error(createError.message);
    }

    console.log(`User created with ID: ${newUser.user.id}`);

    // The profile and user_roles are created by the handle_new_user trigger
    // But we need to create the agency record with contact details
    const { data: agency, error: agencyError } = await supabaseAdmin
      .from("agencies")
      .insert({
        user_id: newUser.user.id,
        agency_name: agencyName,
        license_number: licenseNumber || null,
        address: address || null,
        city: city || null,
        country: country || null,
        commission_rate: commissionRate || 0,
        is_verified: true, // Admin created = auto verified
        is_active: true,
        contact_person_name: contactPersonName || fullName,
        contact_email: contactEmail || email,
        contact_phone: contactPhone || phone,
      })
      .select()
      .single();

    if (agencyError) {
      console.error("Error creating agency:", agencyError);
      // If agency creation fails, we should clean up the user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      throw new Error(agencyError.message);
    }

    console.log(`Agency created: ${agency.agency_name}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: newUser.user.id, email: newUser.user.email },
        agency 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in admin-create-agency:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
