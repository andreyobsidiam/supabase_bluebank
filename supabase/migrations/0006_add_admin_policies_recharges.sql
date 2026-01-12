-- Add policies for admins to manage recharge requests

-- Policy: Admins can view all recharge requests
CREATE POLICY "Admins can view all recharge requests"
ON public.recharge_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid()
  )
);

-- Policy: Admins can update recharge requests (to change status)
CREATE POLICY "Admins can update all recharge requests"
ON public.recharge_requests
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.admins
    WHERE id = auth.uid()
  )
);
