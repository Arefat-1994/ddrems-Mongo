ALTER TABLE agreement_transactions
ADD COLUMN payout_payment_method VARCHAR(50) DEFAULT NULL,
ADD COLUMN payout_receipt_path VARCHAR(500) DEFAULT NULL,
ADD COLUMN owner_verified_payout BOOLEAN DEFAULT FALSE,
ADD COLUMN broker_verified_payout BOOLEAN DEFAULT FALSE;
