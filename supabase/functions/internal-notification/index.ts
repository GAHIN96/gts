
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not configured')
    }

    const { 
      bookingNumber, 
      department, 
      recipientEmail, 
      note, 
      serviceName, 
      destination, 
      passengers, 
      totalAmount,
      customerName,
      agencyName,
      status
    } = await req.json()

    if (!recipientEmail || !bookingNumber) {
      throw new Error('Missing required fields')
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { margin: 0; padding: 0; background: #f8fafc; font-family: 'Segoe UI', system-ui, sans-serif; }
        .wrapper { padding: 32px 16px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .header { background: #1a237e; padding: 24px 32px; color: #ffffff; }
        .header h1 { font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.025em; }
        .header p { font-size: 13px; margin: 4px 0 0; opacity: 0.8; }
        .department-badge { display: inline-block; padding: 4px 12px; background: rgba(255,255,255,0.15); border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-top: 12px; border: 1px solid rgba(255,255,255,0.2); }
        
        .section { padding: 32px; }
        .note-box { background: #fffbeb; border: 1px solid #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin-bottom: 24px; }
        .note-title { font-size: 11px; font-weight: 800; color: #92400e; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
        .note-content { font-size: 14px; color: #78350f; line-height: 1.5; font-style: italic; }
        
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .item { background: #f8fafc; padding: 12px 16px; border-radius: 8px; border: 1px solid #f1f5f9; }
        .item label { display: block; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
        .item span { font-size: 13px; font-weight: 600; color: #1e293b; }
        
        .footer { background: #f1f5f9; padding: 20px 32px; text-align: center; border-top: 1px solid #e2e8f0; }
        .footer p { font-size: 12px; color: #64748b; margin: 0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="header">
            <p>Internal Notification Request</p>
            <h1>Booking Ref: ${bookingNumber}</h1>
            <div class="department-badge">To: ${department || 'Operations'}</div>
          </div>
          
          <div class="section">
            <div class="note-box">
              <div class="note-title">Internal Message / Instruction</div>
              <div class="note-content">"${note}"</div>
            </div>
            
            <h3 style="font-size: 14px; color: #1e293b; margin-bottom: 16px;">Booking Summary Data:</h3>
            <div class="grid">
              <div class="item"><label>Service</label><span>${serviceName || '-'}</span></div>
              <div class="item"><label>Destination</label><span>${destination || '-'}</span></div>
              <div class="item"><label>Customer</label><span>${customerName || '-'}</span></div>
              <div class="item"><label>Agency</label><span>${agencyName || 'Direct'}</span></div>
              <div class="item"><label>Amount</label><span style="color: #16a34a">$${Number(totalAmount || 0).toLocaleString()}</span></div>
              <div class="item"><label>Status</label><span style="text-transform: capitalize">${status || 'Draft'}</span></div>
              <div class="item"><label>Travelers</label><span>${passengers || 1} Person(s)</span></div>
              <div class="item"><label>Reported At</label><span>${new Date().toLocaleString()}</span></div>
            </div>
            
            <p style="font-size: 12px; color: #64748b; text-align: center;">
              Please review this booking and take the necessary actions according to your department protocols.
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated internal alert from the GTS Booking System.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'GTS Internal <notifications@gtsbooking.com>',
        to: [recipientEmail],
        subject: `[INTERNAL ALERT] ${department} - Booking ${bookingNumber}`,
        html: html,
      }),
    })

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
