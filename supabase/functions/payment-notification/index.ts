import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Payment-based notification interface (requires paymentId)
interface PaymentNotificationRequest {
  paymentId?: string;
  action?: "approved" | "rejected";
  rejectionReason?: string;
  // Direct voucher mode (no paymentId needed)
  userEmail?: string;
  userName?: string;
  status?: string;
  bookingNumber?: string;
  bookingType?: string;
  serviceName?: string;
  destination?: string;
  passengers?: number;
  totalAmount?: number;
}

interface VoucherDetails {
  bookingNumber: string;
  bookingType: string;
  serviceName: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  passengers: number;
  totalAmount: number;
}

const formatDate = (dateString?: string): string => {
  if (!dateString) return "N/A";
  const d = new Date(dateString);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const generateVoucherHtml = (voucher: VoucherDetails): string => {
  return `
    <div style="background-color: white; border: 2px solid #1A237E; border-radius: 12px; padding: 30px; margin: 20px 0;">
      <div style="text-align: center; border-bottom: 2px dashed #e5e7eb; padding-bottom: 20px; margin-bottom: 20px;">
        <h2 style="color: #1A237E; margin: 0; font-size: 28px;">🎫 BOOKING VOUCHER</h2>
        <p style="color: #666; margin: 10px 0 0 0; font-size: 14px;">Present this voucher upon arrival</p>
      </div>
      
      <div style="margin-bottom: 20px;">
        <div style="display: inline-block;">
          <p style="color: #999; font-size: 12px; margin: 0;">Booking Number</p>
          <p style="color: #1A237E; font-size: 20px; font-weight: bold; margin: 5px 0 0 0;">${voucher.bookingNumber}</p>
        </div>
        <div style="display: inline-block; float: right; text-align: right;">
          <p style="color: #999; font-size: 12px; margin: 0;">Status</p>
          <span style="background-color: #22c55e; color: white; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: bold;">
            ✓ CONFIRMED
          </span>
        </div>
      </div>
      
      <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px; clear: both;">
        <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px;">${voucher.serviceName}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${voucher.destination ? `
          <tr>
            <td style="padding: 8px 0; color: #666; width: 40%;">📍 Destination:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${voucher.destination}</td>
          </tr>
          ` : ''}
          ${voucher.departureDate ? `
          <tr>
            <td style="padding: 8px 0; color: #666;">📅 Departure:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${formatDate(voucher.departureDate)}</td>
          </tr>
          ` : ''}
          ${voucher.returnDate ? `
          <tr>
            <td style="padding: 8px 0; color: #666;">📅 Return:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${formatDate(voucher.returnDate)}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #666;">👥 Passengers:</td>
            <td style="padding: 8px 0; color: #333; font-weight: 500;">${voucher.passengers} person(s)</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">💰 Total Amount:</td>
            <td style="padding: 8px 0; color: #1A237E; font-weight: bold; font-size: 18px;">$${voucher.totalAmount.toLocaleString()}</td>
          </tr>
        </table>
      </div>
      
      <div style="text-align: center; padding-top: 15px; border-top: 2px dashed #e5e7eb;">
        <p style="color: #666; font-size: 12px; margin: 0;">
          Thank you for booking with GTS Travel!
        </p>
        <p style="color: #999; font-size: 11px; margin: 5px 0 0 0;">
          For support, contact us at support@gtstravel.com
        </p>
      </div>
    </div>
  `;
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

    // Check if user is admin or finance (only they can approve/reject payments)
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    const isAdminOrFinance = roleData?.role === 'admin' || roleData?.role === 'finance';

    if (!isAdminOrFinance) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Only admin or finance can send payment notifications" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    console.log("Received request body:", JSON.stringify(body));

    const { paymentId, action, rejectionReason, userEmail, userName, status, bookingNumber, bookingType, serviceName, destination, passengers, totalAmount } = body as PaymentNotificationRequest;

    // Direct voucher mode - when called with userEmail directly (from Bookings/BookingDetail pages)
    if (userEmail && !paymentId) {
      console.log(`Direct voucher mode for ${userEmail}`);
      const isApproved = status === "approved";
      const statusLabel = isApproved ? "Approved" : "Rejected";
      const statusEmoji = isApproved ? "✅" : "❌";

      const voucherDetails: VoucherDetails | null = isApproved ? {
        bookingNumber: bookingNumber || "N/A",
        bookingType: bookingType || "booking",
        serviceName: serviceName || "Booking",
        destination: destination,
        passengers: passengers || 1,
        totalAmount: totalAmount || 0,
      } : null;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
          <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #1A237E; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 24px;">GTS Travel</h1>
                <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Payment ${statusLabel}</p>
              </div>
              <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #333; margin-top: 0;">Hello ${userName || "Valued Customer"}!</h2>
                <div style="background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 20px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #166534; font-weight: bold; font-size: 18px;">${statusEmoji} Payment ${statusLabel}</p>
                  <p style="margin: 10px 0 0 0; color: #166534;">Your payment has been approved and your booking is now confirmed!</p>
                </div>
                ${voucherDetails ? generateVoucherHtml(voucherDetails) : ''}
                <p style="color: #666; font-size: 14px; margin-top: 30px;">Best regards,<br><strong style="color: #1A237E;">GTS Travel Team</strong></p>
              </div>
            </div>
          </body>
        </html>
      `;

      const emailResponse = await resend.emails.send({
        from: "GTS Travel <onboarding@resend.dev>",
        to: [userEmail],
        subject: `${statusEmoji} Payment ${statusLabel} - ${bookingNumber || "Booking"}`,
        html: emailHtml,
      });

      console.log("Direct voucher email sent:", emailResponse);
      return new Response(JSON.stringify({ success: true, emailResponse }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!paymentId) {
      return new Response(
        JSON.stringify({ success: false, error: "paymentId or userEmail is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Processing ${action} notification for payment ${paymentId}`);

    // Fetch payment with booking details from database
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payments")
      .select(`
        *,
        bookings (
          *,
          package_departures (
            *,
            group_packages (
              *,
              cities:cities!city_id (*)
            )
          )
        )
      `)
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      console.error("Error fetching payment:", paymentError);
      return new Response(
        JSON.stringify({ success: false, error: "Payment not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fetch user profile for email - only send to the actual booking owner
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("email, full_name")
      .eq("id", payment.user_id)
      .single();

    if (profileError || !profile?.email) {
      console.log("No user profile/email found, skipping notification");
      return new Response(
        JSON.stringify({ success: false, message: "No email found for user" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const booking = payment.bookings;
    const packageInfo = booking?.package_departures?.group_packages;
    const cityInfo = packageInfo?.cities;

    const isApproved = action === "approved";
    const statusColor = isApproved ? "#22c55e" : "#ef4444";
    const statusLabel = isApproved ? "Approved" : "Rejected";
    const statusEmoji = isApproved ? "✅" : "❌";

    const voucherDetails: VoucherDetails | null = isApproved && booking ? {
      bookingNumber: booking.booking_number,
      bookingType: booking.booking_type,
      serviceName: packageInfo?.name || `${booking.booking_type} Booking`,
      destination: cityInfo?.name,
      departureDate: booking.package_departures?.departure_date,
      returnDate: booking.package_departures?.return_date,
      passengers: booking.passengers || 1,
      totalAmount: Number(payment.amount),
    } : null;

    const emailHtml = `
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
              <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Payment ${statusLabel}</p>
            </div>
            
            <div style="background-color: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #333; margin-top: 0;">Hello${profile.full_name ? ` ${profile.full_name}` : ''}!</h2>
              
              <div style="background-color: ${isApproved ? '#dcfce7' : '#fee2e2'}; border-left: 4px solid ${statusColor}; padding: 20px; margin: 20px 0; border-radius: 4px;">
                <p style="margin: 0; color: ${isApproved ? '#166534' : '#991b1b'}; font-weight: bold; font-size: 18px;">
                  ${statusEmoji} Payment ${statusLabel}
                </p>
                <p style="margin: 10px 0 0 0; color: ${isApproved ? '#166534' : '#991b1b'};">
                  ${isApproved 
                    ? 'Your payment has been approved and your booking is now confirmed!' 
                    : `Your payment has been rejected.${rejectionReason ? ` Reason: ${rejectionReason}` : ''}`
                  }
                </p>
              </div>
              
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #333; margin: 0 0 15px 0;">Payment Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 10px 0; color: #666;">Booking Number:</td>
                    <td style="padding: 10px 0; color: #333; font-weight: bold; text-align: right;">
                      ${booking?.booking_number || 'N/A'}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #666;">Amount:</td>
                    <td style="padding: 10px 0; color: #1A237E; font-weight: bold; text-align: right;">
                      $${Number(payment.amount).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 0; color: #666;">Payment Method:</td>
                    <td style="padding: 10px 0; color: #333; text-align: right;">
                      ${payment.payment_method.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </td>
                  </tr>
                </table>
              </div>
              
              ${voucherDetails ? `
                <h3 style="color: #333; margin: 30px 0 15px 0;">🎫 Your Booking Voucher</h3>
                <p style="color: #666; margin-bottom: 15px;">Please save or print this voucher for your records:</p>
                ${generateVoucherHtml(voucherDetails)}
              ` : ''}
              
              ${!isApproved ? `
                <div style="background-color: #fef3c7; border-left: 4px solid #eab308; padding: 15px; margin: 20px 0; border-radius: 4px;">
                  <p style="margin: 0; color: #854d0e; font-weight: bold;">What's Next?</p>
                  <p style="margin: 10px 0 0 0; color: #854d0e;">
                    Please review the rejection reason and contact our support team if you have any questions. 
                    You can upload a new payment proof from your booking history.
                  </p>
                </div>
              ` : ''}
              
              <p style="color: #666; font-size: 14px; line-height: 1.6; margin-top: 30px;">
                If you have any questions, please don't hesitate to contact us.
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
    `;

    const emailResponse = await resend.emails.send({
      from: "GTS Travel <onboarding@resend.dev>",
      to: [profile.email],
      subject: `${statusEmoji} Payment ${statusLabel} - ${booking?.booking_number || paymentId}`,
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in payment-notification function:", error);
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
