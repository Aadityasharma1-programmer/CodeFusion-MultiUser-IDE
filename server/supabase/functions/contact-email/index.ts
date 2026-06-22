// @ts-ignore: Deno imports are not recognized by standard Node TypeScript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    const { fullName, email, company, message } = payload as {
      fullName: string;
      email: string;
      company: string;
      message: string;
    };

    // Here you would typically integrate with Resend, SendGrid, or AWS SES
    // Example: send email using Resend API
    // const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    /*
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Contact Form <onboarding@resend.dev>',
        to: 'support@yoursaas.ai',
        subject: `New Contact Request from ${fullName}`,
        html: `<p><strong>Name:</strong> ${fullName}</p>
               <p><strong>Email:</strong> ${email}</p>
               <p><strong>Company:</strong> ${company}</p>
               <p><strong>Message:</strong> ${message}</p>`
      })
    })
    */

    // For now, we simulate success
    console.log(`Received contact request from ${email} (${fullName}), Company: ${company}`)
    console.log(`Message: ${message}`)

    return new Response(
      JSON.stringify({ success: true, message: "Contact request received successfully" }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
