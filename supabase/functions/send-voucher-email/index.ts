const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const { recipientEmail, recipientName, bookingNumber, serviceName, destination, passengers, totalAmount, bookingType } = await req.json()

    if (!recipientEmail || !bookingNumber) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { margin: 0; padding: 0; background: #f4f6f9; font-family: 'Segoe UI', -apple-system, system-ui, sans-serif; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1a237e, #283593); padding: 32px 40px; text-align: center; }
        .header h1 { color: #ffffff; font-size: 24px; margin: 0 0 4px; font-weight: 800; letter-spacing: -0.5px; }
        .header p { color: rgba(255,255,255,0.8); font-size: 13px; margin: 0; }
        .badge { display: inline-block; padding: 6px 16px; background: rgba(255,255,255,0.15); border-radius: 20px; color: #fff; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-top: 12px; }
        .body { padding: 32px 40px; }
        .greeting { font-size: 16px; color: #1a1a2a; margin-bottom: 16px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 24px 0; }
        .info-item { background: #f8f9fc; padding: 14px 16px; border-radius: 10px; border: 1px solid #e8ecf1; }
        .info-item label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; font-weight: 600; margin-bottom: 4px; }
        .info-item span { font-size: 14px; font-weight: 700; color: #1a1a2a; }
        .total { background: linear-gradient(135deg, #1a237e, #283593); color: #fff; padding: 20px; border-radius: 12px; text-align: center; margin-top: 24px; }
        .total .label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; }
        .total .amount { font-size: 32px; font-weight: 800; margin-top: 4px; }
        .footer { padding: 24px 40px; text-align: center; border-top: 1px solid #eee; }
        .footer p { font-size: 12px; color: #999; margin: 0; }
      </style>
    </head>
    <body>
      <div style="padding: 24px;">
        <div class="container">
          <div class="header">
            <h1>Booking Voucher</h1>
            <p>Your travel is confirmed</p>
            <div class="badge">✈ ${bookingType || 'Booking'}</div>
          </div>
          <div class="body">
            <p class="greeting">Dear ${recipientName || 'Valued Customer'},</p>
            <p style="color: #555; font-size: 14px; line-height: 1.6;">
              Your booking has been confirmed! Here are the details of your trip:
            </p>
            <div class="info-grid">
              <div class="info-item">
                <label>Booking Number</label>
                <span>${bookingNumber}</span>
              </div>
              <div class="info-item">
                <label>Service</label>
                <span>${serviceName || '-'}</span>
              </div>
              <div class="info-item">
                <label>Destination</label>
                <span>${destination || '-'}</span>
              </div>
              <div class="info-item">
                <label>Travelers</label>
                <span>${passengers || 1} passenger(s)</span>
              </div>
            </div>
            <div class="total">
              <div class="label">Total Amount</div>
              <div class="amount">$${Number(totalAmount || 0).toLocaleString()}</div>
            </div>
          </div>
          <div class="footer">
            <p>Thank you for choosing our services. Have a great trip! 🌍</p>
          </div>
        </div>
      </div>
    </body>
    </html>
    `

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Travel Booking <onboarding@resend.dev>',
        to: [recipientEmail],
        subject: `Booking Voucher - ${bookingNumber}`,
        html,
      }),
    })

    const emailData = await emailRes.json()

    if (!emailRes.ok) {
      console.error('Resend error:', emailData)
      throw new Error(`Email send failed: ${JSON.stringify(emailData)}`)
    }

    return new Response(JSON.stringify({ success: true, id: emailData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
