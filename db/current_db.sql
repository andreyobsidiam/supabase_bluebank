-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admins (
  id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  email text UNIQUE,
  name text,
  phone_number text,
  CONSTRAINT admins_pkey PRIMARY KEY (id),
  CONSTRAINT admins_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  logon_id text,
  name text,
  email text,
  phone_number text,
  is_banned boolean DEFAULT false,
  banned_until timestamp with time zone,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_user_fk FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL,
  event_type audit_event_type NOT NULL,
  details jsonb,
  device_info jsonb,
  ip_address inet,
  CONSTRAINT user_logs_pkey PRIMARY KEY (id),
  CONSTRAINT user_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);