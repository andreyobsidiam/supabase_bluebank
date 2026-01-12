// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// --- Types & Interfaces ---

type Action =
  | "requestRecharge"
  | "getRechargeHistory"
  | "getAllRechargeRequests"
  | "updateRechargeStatus";

interface RechargeRequestPayload {
  action: Action;
  origin_account?: string;
  destination_card?: string;
  amount?: number;
  id?: string;
  status?: "PROCESSED" | "REJECTED";
}

interface UserProfile {
  name: string;
  email: string;
}

interface RechargeRequestRecord {
  id: string;
  user_id: string;
  origin_account: string;
  destination_card: string;
  amount: number;
  status: string;
  folio: string;
  created_at: string;
  updated_at: string;
  profiles?: UserProfile;
}

// --- Constants ---

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// --- Helpers ---

const createResponse = (data: any, status = 200) => {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
};

const verifyAdmin = async (
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<boolean> => {
  const { data: admin, error } = await supabaseAdmin
    .from("admins")
    .select("id")
    .eq("id", userId)
    .single();

  return !error && !!admin;
};

// --- Action Handlers ---

const handleRequestRecharge = async (
  supabase: SupabaseClient,
  userId: string,
  payload: RechargeRequestPayload
) => {
  const { origin_account, destination_card, amount } = payload;

  if (!origin_account || !destination_card || !amount || amount <= 0) {
    throw {
      status: 400,
      message: "Invalid request data",
      details: { origin_account, destination_card, amount },
    };
  }

  const { data, error } = await supabase
    .from("recharge_requests")
    .insert({
      user_id: userId,
      origin_account,
      destination_card,
      amount,
      status: "PENDING",
    })
    .select()
    .single();

  if (error) throw error;

  console.log(`[RECHARGE] Folio: ${data.folio} requested for user ${userId}`);
  return data;
};

const handleGetRechargeHistory = async (
  supabase: SupabaseClient,
  userId: string
) => {
  const { data, error } = await supabase
    .from("recharge_requests")
    .select()
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

const handleGetAllRechargeRequests = async (supabaseAdmin: SupabaseClient) => {
  const { data, error } = await supabaseAdmin
    .from("recharge_requests")
    .select(
      `
      *,
      profiles:user_id (
        name,
        email
      )
    `
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
};

const handleUpdateRechargeStatus = async (
  supabaseAdmin: SupabaseClient,
  payload: RechargeRequestPayload
) => {
  const { id, status } = payload;

  if (!id || !status || !["PROCESSED", "REJECTED"].includes(status)) {
    throw { status: 400, message: "Invalid status or ID" };
  }

  const { data, error } = await supabaseAdmin
    .from("recharge_requests")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select(
      `
      *,
      profiles:user_id (
        name,
        email
      )
    `
    )
    .single();

  if (error) throw error;
  return data;
};

// --- Main Handler ---

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
      return createResponse({ error: "Unauthorized" }, 401);
    }

    const payload: RechargeRequestPayload = await req.json();
    const { action } = payload;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let result;

    switch (action) {
      case "requestRecharge":
        result = await handleRequestRecharge(supabase, user.id, payload);
        break;

      case "getRechargeHistory":
        result = await handleGetRechargeHistory(supabase, user.id);
        break;

      case "getAllRechargeRequests":
        if (!(await verifyAdmin(supabaseAdmin, user.id))) {
          return createResponse(
            { error: "Forbidden: Admin access required" },
            403
          );
        }
        result = await handleGetAllRechargeRequests(supabaseAdmin);
        break;

      case "updateRechargeStatus":
        if (!(await verifyAdmin(supabaseAdmin, user.id))) {
          return createResponse(
            { error: "Forbidden: Admin access required" },
            403
          );
        }
        result = await handleUpdateRechargeStatus(supabaseAdmin, payload);
        break;

      default:
        return createResponse({ error: "Invalid action" }, 400);
    }

    return createResponse(result);
  } catch (error: any) {
    console.error("Function error:", error);

    const status = error.status || 500;
    const message = error.message || "Internal Server Error";
    const details = error.details || undefined;

    return createResponse({ error: message, details }, status);
  }
});
