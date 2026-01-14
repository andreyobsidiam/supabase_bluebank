// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  readAll,
  writeAll,
} from "https://deno.land/std@0.177.0/streams/mod.ts";

// Polyfill for older libraries that still use Deno.readAll and Deno.writeAll
if (typeof (Deno as any).readAll === "undefined") {
  Object.defineProperty(Deno, "readAll", { value: readAll });
}
if (typeof (Deno as any).writeAll === "undefined") {
  Object.defineProperty(Deno, "writeAll", { value: writeAll });
}

import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";

// --- SMTP Configuration ---
const SMTP_HOSTNAME = Deno.env.get("SMTP_HOSTNAME")!;
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") || "465");
const SMTP_USERNAME = Deno.env.get("SMTP_USERNAME")!;
const SMTP_PASSWORD = Deno.env.get("SMTP_PASSWORD")!;
const SMTP_SENDER = Deno.env.get("SMTP_SENDER")!;

interface EmailRequest {
  templateId: "RECHARGE_REQUEST";
  to: string;
  data: any;
}

const getRechargeTemplate = (data: any) => {
  // Defensive check for profiles being an array (common in Supabase joins)
  const profile = Array.isArray(data.profiles)
    ? data.profiles[0]
    : data.profiles;

  const date = new Date(data.created_at).toLocaleString("en-US", {
    timeZone: "America/New_York",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { 
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
      background-color: #ffffff; 
      margin: 0; 
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      background-color: #ffffff;
      padding: 20px;
    }
    .container { 
      max-width: 600px; 
      background-color: #f4f4f4; 
      margin: 0; 
      text-align: left;
    }
    .header { 
      background-color: #4A90E2; 
      color: #ffffff; 
      padding: 40px 30px; 
    }
    .header h1 { 
      margin: 0; 
      font-size: 28px; 
      font-weight: bold; 
      line-height: 1.2;
    }
    .content { 
      padding: 30px; 
      color: #333333; 
      line-height: 1.6;
      font-size: 15px;
    }
    .footer { 
      padding: 0 30px 40px 30px; 
      color: #333333; 
      font-size: 15px;
    }
    .detail-item {
      margin-bottom: 8px;
    }
    .label { 
      font-weight: normal; 
      color: #333333;
      display: inline-block;
      width: 140px;
    }
    .value {
      color: #000000;
      font-weight: bold;
    }
    .not-reply {
      margin-top: 25px;
      color: #333333;
      font-size: 14px;
    }
    .contact {
      margin-top: 15px;
      color: #333333;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <h1>New Top Up Request</h1>
      </div>
      <div class="content">
        <p>Dear Admin,</p>
        <p>A new top up request has been received with the following details:</p>
        
        <div style="margin: 25px 0;">
          <div class="detail-item">
            <span class="label">Folio:</span> 
            <span class="value">${data.folio || "N/A"}</span>
          </div>
          <div class="detail-item">
            <span class="label">User:</span> 
            <span class="value">${profile?.name || "N/A"}</span>
          </div>
          <div class="detail-item">
            <span class="label">Email:</span> 
            <span class="value">${profile?.email || "N/A"}</span>
          </div>
          <div class="detail-item">
            <span class="label">Amount:</span> 
            <span class="value">$${
              data.amount ? Number(data.amount).toFixed(2) : "0.00"
            }</span>
          </div>
          <div class="detail-item">
            <span class="label">Origin Account:</span> 
            <span class="value">${data.origin_account || "N/A"}</span>
          </div>
          <div class="detail-item">
            <span class="label">Target Card:</span> 
            <span class="value">${data.destination_card || "N/A"}</span>
          </div>
          <div class="detail-item">
            <span class="label">Date:</span> 
            <span class="value">${date}</span>
          </div>
        </div>

        <p class="not-reply">Since this is an automatic response, please do not reply directly to this message.</p>
        <p class="contact">If you face any issue please contact us on +1 5999 461 3967</p>
      </div>
      <div class="footer">
        Best regards,<br>
        <strong>Blue Bank International</strong>
      </div>
    </div>
  </div>
</body>
</html>`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { templateId, to, data }: EmailRequest = body;

    console.log(
      `[EMAIL_SERVICE] Incoming request - Template: ${templateId}, To: ${to}`
    );
    console.log(`[EMAIL_SERVICE] Data received:`, JSON.stringify(data));

    let html = "";
    let subject = "";

    switch (templateId) {
      case "RECHARGE_REQUEST":
        console.log(
          `[EMAIL_SERVICE] Processing RECHARGE_REQUEST for Folio: ${data?.folio}`
        );
        html = getRechargeTemplate(data);
        subject = `New Top Up Requested - Folio: ${data?.folio}`;
        break;
      default:
        console.error(
          `[EMAIL_SERVICE] Invalid templateId received: ${templateId}`
        );
        throw new Error("Invalid templateId");
    }

    console.log(
      `[EMAIL_SERVICE] Connecting to SMTP: ${SMTP_HOSTNAME}:${SMTP_PORT}...`
    );
    const client = new SmtpClient();

    try {
      await client.connectTLS({
        hostname: SMTP_HOSTNAME,
        port: SMTP_PORT,
        username: SMTP_USERNAME,
        password: SMTP_PASSWORD,
      });
      console.log(`[EMAIL_SERVICE] SMTP connection successful.`);
    } catch (connError: any) {
      console.error(
        `[EMAIL_SERVICE] SMTP Connection/Auth Failed:`,
        connError.message
      );
      throw new Error(`SMTP Connection Error: ${connError.message}`);
    }

    console.log(`[EMAIL_SERVICE] Sending email to ${to}...`);

    try {
      await client.send({
        from: SMTP_SENDER,
        to: to,
        subject: subject,
        content: "Nueva notificación de Blue Bank",
        html: html,
      });
      console.log(`[EMAIL_SERVICE] Email sent command successful.`);
    } catch (sendError: any) {
      console.error(`[EMAIL_SERVICE] SMTP Send Failed:`, sendError.message);
      throw new Error(`SMTP Send Error: ${sendError.message}`);
    }

    await client.close();
    console.log(
      `[EMAIL_SERVICE] Client closed. Successfully sent email to ${to}`
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error(
      `[EMAIL_SERVICE] CRITICAL ERROR:`,
      error.message,
      error.stack
    );
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error.stack,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
