// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface LogEventPayload {
  event_type: string;
  details?: Record<string, any>;
  device_info?: Record<string, any>;
}

const createResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createResponse({ error: "No authorization header" }, 401);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const payload: LogEventPayload = await req.json();
    const { event_type, details, device_info } = payload;

    if (!event_type) {
      return createResponse({ error: "event_type is required" }, 400);
    }

    // Get IP address from headers
    const forwardedFor = req.headers.get("x-forwarded-for");
    let ip_address = null;
    if (forwardedFor) {
      ip_address = forwardedFor.split(",")[0].trim();
    }
    const { data, error } = await supabase
      .from("user_logs")
      .insert({
        user_id: user.id,
        event_type,
        details,
        device_info,
        ip_address,
      })
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      throw error;
    }

    return createResponse(data);
  } catch (error: any) {
    console.error("Function error:", error);
    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    return createResponse({ error: message }, status);
  }
});
