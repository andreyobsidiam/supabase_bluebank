-- Fix relationships and policies for recharge requests management

-- 1. Update recharge_requests user_id FK to point to public.profiles instead of auth.users
-- This allows PostgREST to automatically handle the join with the profiles table
ALTER TABLE public.recharge_requests 
DROP CONSTRAINT IF EXISTS recharge_requests_user_id_fkey;

ALTER TABLE public.recharge_requests
ADD CONSTRAINT recharge_requests_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) 
ON DELETE CASCADE;

-- 2. Add policy for admins to view all profiles
-- This is necessary for the join in the Edge Function (or direct SQL) to work correctly
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid()
  )
);

-- 3. Ensure admins can view and update all recharges (already added in 0006, but double checking/ensuring)
DROP POLICY IF EXISTS "Admins can view all recharge requests" ON public.recharge_requests;
CREATE POLICY "Admins can view all recharge requests"
ON public.recharge_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can update all recharge requests" ON public.recharge_requests;
CREATE POLICY "Admins can update all recharge requests"
ON public.recharge_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid()
  )
);
