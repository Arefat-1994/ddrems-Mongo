-- ============================================================================
-- DIRECT AGREEMENT FLOW — 12-STEP MIGRATION
-- Adds columns for price negotiation, video upload, media release, 
-- dual handover, and system commission tracking
-- ============================================================================

-- System fee payer (buyer, owner, or split)
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS system_fee_payer VARCHAR(20) DEFAULT 'buyer';

-- Video upload by owner
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS video_url VARCHAR(500) NULL;
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS video_uploaded_at TIMESTAMP NULL;
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS video_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS video_verified_by INT NULL;
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS video_verified_at TIMESTAMP NULL;

-- Media release tracking
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS media_released BOOLEAN DEFAULT FALSE;
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS media_released_at TIMESTAMP NULL;
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS media_released_by INT NULL;
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS media_viewed BOOLEAN DEFAULT FALSE;
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS media_viewed_at TIMESTAMP NULL;

-- Dual handover (both buyer and owner confirm)
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS buyer_handover_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS owner_handover_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS buyer_handover_date TIMESTAMP NULL;
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS owner_handover_date TIMESTAMP NULL;

-- Counter offer tracking
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS counter_offer_price DECIMAL(15,2) NULL;
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS negotiation_rounds INT DEFAULT 0;

-- Payment rejection support
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS payment_rejected BOOLEAN DEFAULT FALSE;
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS payment_rejection_reason TEXT NULL;

-- Payout tracking
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS payout_payment_method VARCHAR(50) NULL;
ALTER TABLE agreement_requests ADD COLUMN IF NOT EXISTS payout_receipt VARCHAR(500) NULL;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
