import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

interface Beneficiary {
  id?: string;
  name: string;
  nickname?: string;
  type: "bluePay" | "wireTransfer";
  account_number: string;
  bank_name?: string;
  swift_code?: string;
  address?: string;
  country?: string;
  currency?: string;
  bank_address?: string;
  bank_code_type?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    // Create Supabase client with the user's token
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const url = new URL(req.url);
    const method = req.method;

    // GET: List all beneficiaries for the user
    if (method === "GET") {
      const { data, error } = await supabase
        .from("beneficiaries")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // POST: Create a new beneficiary
    if (method === "POST") {
      const body: Beneficiary = await req.json();

      // Basic validation
      if (!body.name || !body.type || !body.account_number) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: name, type, account_number",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      const { data, error } = await supabase
        .from("beneficiaries")
        .insert({
          user_id: user.id,
          name: body.name,
          nickname: body.nickname,
          type: body.type,
          account_number: body.account_number,
          bank_name: body.bank_name,
          swift_code: body.swift_code,
          address: body.address,
          country: body.country,
          currency: body.currency,
          bank_address: body.bank_address,
          bank_code_type: body.bank_code_type,
        })
        .select()
        .single();

      if (error) throw error;
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 201,
      });
    }

    // DELETE: Remove a beneficiary
    if (method === "DELETE") {
      let id = url.searchParams.get("id");

      if (!id) {
        try {
          const body = await req.json();
          id = body.id;
        } catch (e) {
          // Body might not be JSON or empty
        }
      }

      if (!id) {
        return new Response(JSON.stringify({ error: "Missing id parameter" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      const { error } = await supabase
        .from("beneficiaries")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return new Response(
        JSON.stringify({ message: "Beneficiary deleted successfully" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 405,
    });
  } catch (error) {
    console.error("Error in beneficiaries function:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
