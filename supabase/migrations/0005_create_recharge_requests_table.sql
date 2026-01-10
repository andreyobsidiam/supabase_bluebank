
CREATE TABLE IF NOT EXISTS public.recharge_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    origin_account VARCHAR(30) NOT NULL,
    destination_card VARCHAR(30) NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSED, REJECTED
    folio SERIAL NOT NULL
);

-- Index for faster queries on user_id and status
CREATE INDEX IF NOT EXISTS idx_recharge_requests_user_id ON public.recharge_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_recharge_requests_status ON public.recharge_requests(status);

-- Add comment to the table and columns
COMMENT ON TABLE public.recharge_requests IS 'Stores prepaid card recharge requests.';
COMMENT ON COLUMN public.recharge_requests.origin_account IS 'Origin account number.';
COMMENT ON COLUMN public.recharge_requests.destination_card IS 'Destination prepaid card number.';
COMMENT ON COLUMN public.recharge_requests.folio IS 'Auto-incrementing folio number for the request.';

-- Enable Row Level Security
ALTER TABLE public.recharge_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own recharge requests
CREATE POLICY "Users can only see their own recharge requests"
ON public.recharge_requests
FOR ALL
USING (auth.uid() = user_id);
