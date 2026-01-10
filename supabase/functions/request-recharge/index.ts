// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

interface RechargeRequest {
  origin_account_last_4: string;
  destination_card_last_4: string;
  amount: number;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: { Authorization: req.headers.get("Authorization")! },
      },
    });

    // Get the user from the auth header
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const json = await req.json();
    const action = json.action;

    let result;

    switch (action) {
      case "requestRecharge": {
        const { origin_account, destination_card, amount } =
          json as RechargeRequest & {
            action: string;
            origin_account: string;
            destination_card: string;
          };

        // Validation
        if (!origin_account || !destination_card || !amount || amount <= 0) {
          return new Response(
            JSON.stringify({
              error: "Invalid request data",
              details: { origin_account, destination_card, amount },
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        // Insert into DB
        const { data, error } = await supabase
          .from("recharge_requests")
          .insert({
            user_id: user.id,
            origin_account,
            destination_card,
            amount,
            status: "PENDING", // Default
          })
          .select()
          .single();

        if (error) throw error;
        result = data;

        // TODO: Configure Email Sending
        console.log(
          `[TODO] Send email for recharge request Folio: ${data.folio}`
        );
        break;
      }

      case "getRechargeHistory": {
        const { data, error } = await supabase
          .from("recharge_requests")
          .select()
          .eq("user_id", user.id) // Enforce user context although RLS handles it too
          .order("created_at", { ascending: false });

        if (error) throw error;
        result = data;
        break;
      }

      default:
        return new Response(JSON.stringify({ error: "Invalid action" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal Server Error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
