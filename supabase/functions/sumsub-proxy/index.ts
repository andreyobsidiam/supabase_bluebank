import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Función pública - no requiere autenticación JWT

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const sumsubAppToken = Deno.env.get("SUMSUB_APP_TOKEN");
    const sumsubSecretKey = Deno.env.get("SUMSUB_SECRET_TOKEN");

    if (!sumsubAppToken || !sumsubSecretKey) {
      return new Response(
        JSON.stringify({ error: "Sumsub configuration not found" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body to get levelName
    const requestBody = await req.json();
    const levelName = requestBody.levelName;

    if (!levelName) {
      return new Response(JSON.stringify({ error: "levelName is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const method = "POST";
    const endpoint = "/resources/sdkIntegrations/levels/-/websdkLink";
    const sumsubUrl = `https://api.sumsub.com${endpoint}`;

    // Cuerpo del request
    const body = { ttlInSecs: 1800, levelName: levelName };
    const requestBodyStr = JSON.stringify(body);

    // Construir cadena para la firma
    const dataToSign = `${timestamp}${method}${endpoint}${requestBodyStr}`;

    // Generar firma HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(sumsubSecretKey),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(dataToSign)
    );
    const signatureHex = Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Headers
    const headers = {
      "Content-Type": "application/json",
      "X-App-Token": sumsubAppToken,
      "X-App-Access-Ts": timestamp,
      "X-App-Access-Sig": signatureHex,
    };

    // Make request to Sumsub API
    const sumsubResponse = await fetch(sumsubUrl, {
      method: method,
      headers: headers,
      body: requestBodyStr,
    });

    const responseBody = await sumsubResponse.text();

    // Return response with CORS headers
    return new Response(responseBody, {
      status: sumsubResponse.status,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error in sumsub-proxy:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
