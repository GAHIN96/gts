import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BookingNotificationRequest {
  bookingId: string;
  newStatus: string;
  bookingNumber: string;
  bookingType: string;
  userEmail: string;
  totalAmount: number;
}

const statusLabels: Record<string, string> = {
  draft: "Draft",
  pending_payment: "Pending Payment",
  payment_under_review: "Payment Under Review",
  confirmed: "Confirmed",
  canceled: "Canceled",
  refunded: "Refunded",
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case "confirmed":
      return "#22c55e";
    case "canceled":
    case "refunded":
      return "#ef4444";
    case "pending_payment":
    case "payment_under_review":
      return "#eab308";
    default:
      return "#6b7280";
  }
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - No valid token provided" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized - Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;
    console.log(`Authenticated user: ${userId}`);

    const { 
      bookingId, 
      newStatus, 
      bookingNumber, 
      bookingType,
      userEmail,
      totalAmount 
    }: BookingNotificationRequest = await req.json();

    console.log(`Sending notification for booking ${bookingNumber} - new status: ${newStatus}`);

    // Verify the booking exists
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .select("user_id")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      console.error("Booking not found:", bookingError);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user owns the booking or is admin
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const isAdmin = roleData?.role === 'admin';
    const isOwner = booking.user_id === userId;

    if (!isAdmin && !isOwner) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Cannot send notification for this booking" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get email from profile if not provided, to ensure we're sending to the right user
    let recipientEmail = userEmail;
    if (!recipientEmail) {
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", booking.user_id)
        .single();
      
      if (!profile?.email) {
        console.log("No user email found, skipping notification");
        return new Response(
          JSON.stringify({ success: false, message: "No email provided" }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      recipientEmail = profile.email;
    }

    const statusLabel = statusLabels[newStatus] || newStatus;
    const statusColor = getStatusColor(newStatus);

    const emailResponse = await resend.emails.send({
      from: "GTS Travel <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: `Booking ${bookingNumber} - Status Updated to ${statusLabel}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #1A237E; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">GTS Travel</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Booking Status Update</p>
              </div>
              
              <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #333; margin-top: 0;">Hello!</h2>
                
                <p style="color: #666; font-size: 16px; line-height: 1.6;">
                  Your ${bookingType} booking has been updated.
                </p>
                
                <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 10px 0; color: #666;">Booking Number:</td>
                      <td style="padding: 10px 0; color: #333; font-weight: bold; text-align: right;">${bookingNumber}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #666;">Booking Type:</td>
                      <td style="padding: 10px 0; color: #333; text-transform: capitalize; text-align: right;">${bookingType}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #666;">Total Amount:</td>
                      <td style="padding: 10px 0; color: #1A237E; font-weight: bold; text-align: right;">$${totalAmount.toLocaleString()}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px 0; color: #666;">New Status:</td>
                      <td style="padding: 10px 0; text-align: right;">
                        <span style="background-color: ${statusColor}; color: white; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: bold;">
                          ${statusLabel}
                        </span>
                      </td>
                    </tr>
                  </table>
                </div>
                
                ${newStatus === 'confirmed' ? `
                  <div style="background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #166534; font-weight: bold;">🎉 Congratulations!</p>
                    <p style="margin: 10px 0 0 0; color: #166534;">Your booking has been confirmed. We look forward to serving you!</p>
                  </div>
                ` : ''}
                
                ${newStatus === 'pending_payment' ? `
                  <div style="background-color: #fef3c7; border-left: 4px solid #eab308; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #854d0e; font-weight: bold;">⏳ Payment Required</p>
                    <p style="margin: 10px 0 0 0; color: #854d0e;">Please complete your payment to confirm your booking.</p>
                  </div>
                ` : ''}
                
                ${newStatus === 'canceled' ? `
                  <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #991b1b; font-weight: bold;">Booking Canceled</p>
                    <p style="margin: 10px 0 0 0; color: #991b1b;">If you have any questions, please contact our support team.</p>
                  </div>
                ` : ''}
                
                <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                  If you have any questions about your booking, please don't hesitate to contact us.
                </p>
                
                <p style="color: #666; font-size: 14px; margin-top: 30px;">
                  Best regards,<br>
                  <strong style="color: #1A237E;">GTS Travel Team</strong>
                </p>
              </div>
              
              <div style="text-align: center; padding: 20px;">
                <p style="color: #999; font-size: 12px; margin: 0;">
                  © ${new Date().getFullYear()} GTS Travel. All rights reserved.
                </p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in booking-status-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
