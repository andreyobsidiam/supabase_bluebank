// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { corsHeaders } from "../_shared/cors.ts";

const MAILERSEND_API_URL = 'https://api.mailersend.com/v1/email';
// IMPORTANT: Set these environment variables in your Supabase project settings
const MAILERSEND_API_KEY = Deno.env.get('MAILERSEND_API_KEY');
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL');

Deno.serve(async (req: Request) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, subject, template_id } = await req.json();

    if (!email || !subject || !template_id) {
      return new Response(JSON.stringify({ error: 'Email, subject, and template_id are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    const res = await fetch(MAILERSEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MAILERSEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: { email: SENDER_EMAIL },
        to: [{ email }],
        subject: subject,
        personalization: [
          {
            email: email,
            data: { "variable": otp }, // Ensure your template uses 'variable' or change this key
          }
        ],
        template_id: template_id,
      }),
    });

    if (!res.ok) {
        const errorData = await res.json();
        console.error('MailerSend error:', errorData);
        return new Response(JSON.stringify({ error: 'Failed to send OTP' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        });
    }

    return new Response(JSON.stringify({ otp }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
