// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

enum AuthAction {
  LOGIN = "login",
  CREATE = "create",
  SYNC = "sync",
}

interface AuthRequest {
  action: AuthAction;
  identifier: string; // Required for login and create
  logon_id?: string; // Required for create
  password: string;
  name?: string; // Optional for create
  phone_number?: string; // Optional for create
}

interface AuthResponse {
  user: any;
  session?: any;
  user_profile: Profile;
  message: string;
}

interface ErrorResponse {
  error: string;
}

interface Profile {
  id: string;
  created_at: string;
  logon_id: string;
  name?: string;
  email: string;
  phone_number?: string;
  is_banned?: boolean;
  banned_until?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authData: AuthRequest = await req.json();
    const { action, identifier, logon_id, password, name, phone_number } =
      authData;

    // Validate action
    if (!action || !Object.values(AuthAction).includes(action)) {
      const errorResponse: ErrorResponse = {
        error: "action_must_be_login_or_create",
      };
      return new Response(JSON.stringify(errorResponse), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Create Supabase clients
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const serviceSupabase = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // For create action, use service role to bypass email confirmation
    const adminSupabase =
      action === AuthAction.CREATE ? serviceSupabase : supabase;

    switch (action) {
      case AuthAction.LOGIN: {
        // LOGIN LOGIC
        if (!identifier || !identifier.trim()) {
          const errorResponse: ErrorResponse = {
            error: "identifier_is_required",
          };
          return new Response(JSON.stringify(errorResponse), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        if (!password) {
          const errorResponse: ErrorResponse = {
            error: "password_is_required",
          };
          return new Response(JSON.stringify(errorResponse), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Find user profile by logon_id or email
        const { data: userProfile, error: profileError } = await serviceSupabase
          .from("profiles")
          .select("*")
          .or(`logon_id.eq.${identifier.trim()},email.eq.${identifier.trim()}`)
          .single();

        if (profileError || !userProfile) {
          const errorResponse: ErrorResponse = {
            error: "no_user_found",
          };
          return new Response(JSON.stringify(errorResponse), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
          });
        }

        // Authenticate with the email from the profile
        const { data, error } = await supabase.auth.signInWithPassword({
          email: userProfile.email,
          password: password,
        });

        if (error) {
          const errorResponse: ErrorResponse = {
            error: "invalid_login_credentials",
          };
          return new Response(JSON.stringify(errorResponse), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
          });
        }

        const authResponse: AuthResponse = {
          user: data.user,
          session: data.session,
          user_profile: userProfile,
          message: "Login successful",
        };
        return new Response(JSON.stringify(authResponse), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case AuthAction.CREATE: {
        // CREATE LOGIC
        if (!identifier || !logon_id || !password) {
          const errorResponse: ErrorResponse = {
            error:
              "identifier_logon_id_and_password_are_required_for_user_creation",
          };
          return new Response(JSON.stringify(errorResponse), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Check if logon_id already exists
        const { data: existingProfile } = await serviceSupabase
          .from("profiles")
          .select("id")
          .eq("logon_id", logon_id.trim())
          .single();

        if (existingProfile) {
          const errorResponse: ErrorResponse = {
            error: "logon_id_already_exists",
          };
          return new Response(JSON.stringify(errorResponse), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 409,
          });
        }

        // Create user account
        const { data: authData, error: signUpError } =
          await serviceSupabase.auth.admin.createUser({
            email: identifier.trim(),
            password: password,
            email_confirm: true,
          });

        if (signUpError) {
          const errorResponse: ErrorResponse = {
            error: signUpError.message,
          };
          return new Response(JSON.stringify(errorResponse), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Sign in to get session
        const { data: signInData, error: signInError } =
          await adminSupabase.auth.signInWithPassword({
            email: identifier.trim(),
            password: password,
          });

        if (signInError) {
          const errorResponse: ErrorResponse = {
            error: signInError.message,
          };
          return new Response(JSON.stringify(errorResponse), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Create profile record
        const { error: profileError } = await serviceSupabase
          .from("profiles")
          .insert({
            id: signInData.user.id,
            email: identifier.trim(),
            logon_id: logon_id.trim(),
            name: name?.trim() || null,
            phone_number: phone_number?.trim() || null,
          });

        if (profileError) {
          console.error("Profile creation error:", profileError);
          const errorResponse: ErrorResponse = {
            error: `failed_to_create_user_profile: ${
              profileError.message || profileError.code || "unknown error"
            }`,
          };
          return new Response(JSON.stringify(errorResponse), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          });
        }

        // Fetch the created profile
        const { data: userProfile, error: fetchProfileError } =
          await serviceSupabase
            .from("profiles")
            .select("*")
            .eq("id", signInData.user.id)
            .single();

        if (fetchProfileError) {
          const errorResponse: ErrorResponse = {
            error: "failed_to_fetch_created_user_profile",
          };
          return new Response(JSON.stringify(errorResponse), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
          });
        }

        const authResponse: AuthResponse = {
          user: signInData.user,
          session: signInData.session,
          user_profile: userProfile,
          message: "User created successfully",
        };
        return new Response(JSON.stringify(authResponse), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 201,
        });
      }

      case AuthAction.SYNC: {
        // SYNC LOGIC: Verify if user exists, update password if yes, create if no.
        if (!identifier || !logon_id || !password) {
          const errorResponse: ErrorResponse = {
            error: "identifier_logon_id_and_password_are_required_for_sync",
          };
          return new Response(JSON.stringify(errorResponse), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        // Check if user exists by logon_id OR email
        const { data: existingProfile } = await serviceSupabase
          .from("profiles")
          .select("*")
          .or(`logon_id.eq.${logon_id.trim()},email.eq.${identifier.trim()}`)
          .maybeSingle();

        if (existingProfile) {
          // UPDATE PASSWORD if user already exists
          const { error: updateError } =
            await serviceSupabase.auth.admin.updateUserById(
              existingProfile.id,
              { password: password }
            );

          if (updateError) {
            const errorResponse: ErrorResponse = {
              error: `failed_to_update_password: ${updateError.message}`,
            };
            return new Response(JSON.stringify(errorResponse), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 500,
            });
          }

          // Sign in to get session with the new password
          const { data: signInData, error: signInError } =
            await supabase.auth.signInWithPassword({
              email: existingProfile.email,
              password: password,
            });

          if (signInError) {
            const errorResponse: ErrorResponse = {
              error: `failed_to_sign_in_after_update: ${signInError.message}`,
            };
            return new Response(JSON.stringify(errorResponse), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 401,
            });
          }

          const authResponse: AuthResponse = {
            user: signInData.user,
            session: signInData.session,
            user_profile: existingProfile,
            message: "User password updated and logged in successfully",
          };
          return new Response(JSON.stringify(authResponse), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        } else {
          // CREATE USER if not found (Same logic as CREATE case)
          const { data: authData, error: signUpError } =
            await serviceSupabase.auth.admin.createUser({
              email: identifier.trim(),
              password: password,
              email_confirm: true,
            });

          if (signUpError) {
            const errorResponse: ErrorResponse = {
              error: signUpError.message,
            };
            return new Response(JSON.stringify(errorResponse), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            });
          }

          const { data: signInData, error: signInError } =
            await adminSupabase.auth.signInWithPassword({
              email: identifier.trim(),
              password: password,
            });

          if (signInError) {
            const errorResponse: ErrorResponse = {
              error: signInError.message,
            };
            return new Response(JSON.stringify(errorResponse), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            });
          }

          const { error: profileError } = await serviceSupabase
            .from("profiles")
            .insert({
              id: signInData.user.id,
              email: identifier.trim(),
              logon_id: logon_id.trim(),
              name: name?.trim() || null,
              phone_number: phone_number?.trim() || null,
            });

          if (profileError) {
            const errorResponse: ErrorResponse = {
              error: `failed_to_create_profile: ${profileError.message}`,
            };
            return new Response(JSON.stringify(errorResponse), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 500,
            });
          }

          const { data: userProfile } = await serviceSupabase
            .from("profiles")
            .select("*")
            .eq("id", signInData.user.id)
            .single();

          const authResponse: AuthResponse = {
            user: signInData.user,
            session: signInData.session,
            user_profile: userProfile,
            message: "User created and logged in successfully",
          };
          return new Response(JSON.stringify(authResponse), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 201,
          });
        }
      }

      default: {
        const errorResponse: ErrorResponse = {
          error: "invalid_action",
        };
        return new Response(JSON.stringify(errorResponse), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    }
  } catch (error) {
    console.error("Function error:", error);
    const errorResponse: ErrorResponse = {
      error: error instanceof Error ? error.message : "internal_server_error",
    };
    return new Response(JSON.stringify(errorResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
