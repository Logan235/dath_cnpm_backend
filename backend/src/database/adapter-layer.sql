-- =====================================================================
-- ADAPTER LAYER: Sync giữa Backend Schema và AI Service Schema
-- =====================================================================
-- Mục tiêu:
--   * AI Service (Python) làm việc với: crawl_ads, ads_classified
--   * Backend (NestJS) làm việc với: ad_items, ai_analyses
--   * Database triggers tự động sync 2 chiều REAL-TIME
-- 
-- Cách chạy:
--   npm run db:adapter
--   Hoặc: psql -U user -d ad_monitoring -f src/database/adapter-layer.sql
-- =====================================================================

-- Ensure required columns exist on existing tables if they were created with old schemas
ALTER TABLE ad_items ADD COLUMN IF NOT EXISTS crawl_job_id INT;
ALTER TABLE ad_items ADD COLUMN IF NOT EXISTS schedule_id INT;
ALTER TABLE ad_items ADD COLUMN IF NOT EXISTS crawl_source_id INT;
ALTER TABLE ad_items ADD COLUMN IF NOT EXISTS topic_id INT;

-- ---------------------------------------------------------------------
-- 1. TẠO BẢNG crawl_ads (Schema AI Service đang sử dụng)
-- ---------------------------------------------------------------------
-- Drop existing table if it has wrong schema (from crawler data schema)
DROP TABLE IF EXISTS crawl_ads CASCADE;

CREATE TABLE crawl_ads (
    id BIGINT PRIMARY KEY,  -- Sync với ad_items.id
    name VARCHAR(255),      -- Mapping từ ad_items.author_name
    text TEXT NOT NULL,     -- Mapping từ ad_items.content + title
    link VARCHAR(1000),     -- Mapping từ ad_items.source_url
    date TIMESTAMP,         -- Mapping từ ad_items.published_at
    images JSONB DEFAULT '[]'::jsonb,  -- Extract từ ad_items.media
    videos JSONB DEFAULT '[]'::jsonb,  -- Extract từ ad_items.media
    keyword VARCHAR(500),   -- Mapping từ schedule.primary_keywords
    crawl_src VARCHAR(100), -- Mapping từ ad_items.platform
    crawl_job_id VARCHAR(100), -- Mapping từ ad_items.crawl_job_id (cast to text)
    status VARCHAR(20) DEFAULT 'new',  -- 'new' | 'processing' | 'done'
    last_classified TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_crawl_ads_status ON crawl_ads(status);
CREATE INDEX IF NOT EXISTS idx_crawl_ads_job ON crawl_ads(crawl_job_id);
CREATE INDEX IF NOT EXISTS idx_crawl_ads_date ON crawl_ads(date);

COMMENT ON TABLE crawl_ads IS 'Adapter table cho AI Service - sync từ ad_items';
COMMENT ON COLUMN crawl_ads.status IS 'AI Service status: new (chờ xử lý), processing (đang xử lý), done (đã xong)';

-- ---------------------------------------------------------------------
-- 2. TẠO BẢNG ads_classified (Kết quả AI Service trả về)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ads_classified (
    id SERIAL PRIMARY KEY,
    ad_id BIGINT NOT NULL,  -- FK to crawl_ads.id (= ad_items.id)
    process_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    process_end TIMESTAMP,
    processing_time FLOAT,  -- Seconds
    
    -- Classification results
    is_medical_ad BOOLEAN DEFAULT FALSE,
    organization_names TEXT[] DEFAULT '{}',
    addresses TEXT[] DEFAULT '{}',
    persons TEXT[] DEFAULT '{}',
    specialty TEXT[] DEFAULT '{}',
    techniques TEXT[] DEFAULT '{}',
    
    -- Compliance status
    process_status VARCHAR(50),  -- 'success' | 'failed'
    compliant_status VARCHAR(50), -- 'VIOLATION' | 'SUSPECTED' | 'NO_VIOLATION'
    compliant_detail TEXT,
    
    -- Full AI output (raw JSON từ AI pipeline)
    full_output JSONB,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (ad_id) REFERENCES crawl_ads(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ads_classified_ad ON ads_classified(ad_id);
CREATE INDEX IF NOT EXISTS idx_ads_classified_status ON ads_classified(compliant_status);
CREATE INDEX IF NOT EXISTS idx_ads_classified_created ON ads_classified(created_at);

COMMENT ON TABLE ads_classified IS 'Kết quả phân tích từ AI Service - sẽ sync sang ai_analyses';

-- ---------------------------------------------------------------------
-- 3. TRIGGER: ad_items → crawl_ads (Backend insert → AI nhìn thấy)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_ad_items_to_crawl_ads()
RETURNS TRIGGER AS $$
DECLARE
    v_keyword TEXT;
    v_images JSONB;
    v_videos JSONB;
BEGIN
    -- Chỉ sync khi status = FILTERED (sẵn sàng cho AI phân tích)
    IF (TG_OP = 'INSERT' AND NEW.status = 'FILTERED') OR 
       (TG_OP = 'UPDATE' AND OLD.status != 'FILTERED' AND NEW.status = 'FILTERED') THEN
        
        -- Lấy keyword từ schedule nếu có
        v_keyword := '';
        IF NEW.schedule_id IS NOT NULL THEN
            SELECT primary_keywords INTO v_keyword
            FROM crawl_schedules
            WHERE id = NEW.schedule_id;
        END IF;
        
        -- Extract images từ media JSONB
        SELECT COALESCE(jsonb_agg(item->>'url'), '[]'::jsonb)
        INTO v_images
        FROM jsonb_array_elements(NEW.media) AS item
        WHERE item->>'type' = 'IMAGE';
        
        -- Extract videos từ media JSONB
        SELECT COALESCE(jsonb_agg(item->>'url'), '[]'::jsonb)
        INTO v_videos
        FROM jsonb_array_elements(NEW.media) AS item
        WHERE item->>'type' = 'VIDEO';
        
        -- Insert hoặc update crawl_ads
        INSERT INTO crawl_ads (
            id, name, text, link, date, images, videos,
            keyword, crawl_src, crawl_job_id, status, created_at
        ) VALUES (
            NEW.id::BIGINT,
            NEW.author_name,
            COALESCE(NEW.title || E'\n\n', '') || NEW.content,
            NEW.source_url,
            NEW.published_at,
            v_images,
            v_videos,
            COALESCE(v_keyword, ''),
            NEW.platform,
            COALESCE(NEW.crawl_job_id::TEXT, ''),
            'new',
            NEW.collected_at
        )
        ON CONFLICT (id) DO UPDATE SET
            text = EXCLUDED.text,
            status = 'new',
            last_classified = NULL;
    END IF;
    
    -- Khi Backend update status FILTERED → AI_ANALYZING
    IF TG_OP = 'UPDATE' AND OLD.status = 'FILTERED' AND NEW.status = 'AI_ANALYZING' THEN
        UPDATE crawl_ads
        SET status = 'processing', last_classified = CURRENT_TIMESTAMP
        WHERE id = NEW.id::BIGINT;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_ad_items_to_crawl_ads ON ad_items;
CREATE TRIGGER trg_sync_ad_items_to_crawl_ads
    AFTER INSERT OR UPDATE ON ad_items
    FOR EACH ROW
    EXECUTE FUNCTION sync_ad_items_to_crawl_ads();

-- ---------------------------------------------------------------------
-- 4. TRIGGER: ads_classified → ai_analyses (AI xong → Backend nhận)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_ads_classified_to_ai_analyses()
RETURNS TRIGGER AS $$
DECLARE
    v_model_id INT := 1;
    v_label VARCHAR(30);
    v_confidence FLOAT;
    v_violation_types JSONB;
    v_extracted JSONB;
    v_priority INT;
    v_suspicion_level VARCHAR(10);
BEGIN
    -- Mapping compliant_status → label
    CASE NEW.compliant_status
        WHEN 'VIOLATION' THEN 
            v_label := 'VIOLATION';
            v_confidence := 0.85;
            v_priority := 80;
            v_suspicion_level := 'HIGH';
        WHEN 'SUSPECTED' THEN 
            v_label := 'SUSPECTED';
            v_confidence := 0.65;
            v_priority := 50;
            v_suspicion_level := 'MEDIUM';
        ELSE 
            v_label := 'NO_VIOLATION';
            v_confidence := 0.50;
            v_priority := 20;
            v_suspicion_level := 'LOW';
    END CASE;
    
    -- Extract violation types
    v_violation_types := COALESCE(
        NEW.full_output->'steps'->'step4_compliance'->'violations'->'banned_words',
        '[]'::jsonb
    );
    
    -- Build extracted_entities
    v_extracted := jsonb_build_object(
        'facilityNames', to_jsonb(COALESCE(NEW.organization_names, '{}'::TEXT[])),
        'phones', '[]'::jsonb,
        'urls', '[]'::jsonb,
        'licenseNumbers', '[]'::jsonb,
        'doctorNames', to_jsonb(COALESCE(NEW.persons, '{}'::TEXT[])),
        'techniques', to_jsonb(COALESCE(NEW.techniques, '{}'::TEXT[])),
        'claims', v_violation_types,
        'addresses', to_jsonb(COALESCE(NEW.addresses, '{}'::TEXT[]))
    );
    
    -- Vô hiệu hóa analysis cũ
    UPDATE ai_analyses SET is_latest = FALSE WHERE ad_item_id = NEW.ad_id::TEXT;
    
    -- Insert ai_analyses mới
    INSERT INTO ai_analyses (
        ad_item_id, model_id, label, confidence, violation_types,
        matched_rules, extracted_entities, legal_refs, explanation,
        priority_score, is_latest, processing_ms, created_at
    ) VALUES (
        NEW.ad_id::TEXT,
        v_model_id,
        v_label,
        v_confidence,
        v_violation_types,
        '[]'::jsonb,
        v_extracted,
        '[]'::jsonb,
        COALESCE(NEW.compliant_detail, 'AI analysis completed'),
        v_priority,
        TRUE,
        COALESCE((NEW.processing_time * 1000)::INT, 0),
        CURRENT_TIMESTAMP
    );
    
    -- Update ad_items status
    UPDATE ad_items
    SET status = 'AI_ANALYZED', suspicion_level = v_suspicion_level,
        priority = v_priority, updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.ad_id::TEXT;
    
    -- Update crawl_ads status
    UPDATE crawl_ads SET status = 'done' WHERE id = NEW.ad_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_ads_classified_to_ai_analyses ON ads_classified;
CREATE TRIGGER trg_sync_ads_classified_to_ai_analyses
    AFTER INSERT ON ads_classified
    FOR EACH ROW
    EXECUTE FUNCTION sync_ads_classified_to_ai_analyses();

-- ---------------------------------------------------------------------
-- 5. VIEWS & HELPER FUNCTIONS
-- ---------------------------------------------------------------------
CREATE OR REPLACE VIEW v_pending_ai_analysis AS
SELECT 
    ca.id, ca.text, ca.keyword, ca.crawl_job_id, ca.status,
    ca.created_at, ca.link, ca.images, ca.videos
FROM crawl_ads ca
WHERE ca.status = 'new'
ORDER BY ca.created_at ASC;

COMMENT ON VIEW v_pending_ai_analysis IS 'AI Service query view này để lấy ads chờ phân tích';

-- Stats view for monitoring
CREATE OR REPLACE VIEW v_adapter_stats AS
SELECT 
    (SELECT COUNT(*) FROM crawl_ads WHERE status = 'new') AS pending_ai,
    (SELECT COUNT(*) FROM crawl_ads WHERE status = 'processing') AS processing_ai,
    (SELECT COUNT(*) FROM crawl_ads WHERE status = 'done') AS completed_ai,
    (SELECT COUNT(*) FROM ads_classified) AS total_classified,
    (SELECT COUNT(*) FROM ai_analyses WHERE is_latest = TRUE) AS total_ai_analyses,
    (SELECT COUNT(*) FROM ad_items WHERE status = 'FILTERED') AS backend_filtered,
    (SELECT COUNT(*) FROM ad_items WHERE status = 'AI_ANALYZING') AS backend_analyzing,
    (SELECT COUNT(*) FROM ad_items WHERE status = 'AI_ANALYZED') AS backend_analyzed;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_ad_items_status_filtered 
    ON ad_items(status) WHERE status = 'FILTERED';
CREATE INDEX IF NOT EXISTS idx_ai_analyses_latest 
    ON ai_analyses(ad_item_id, is_latest) WHERE is_latest = TRUE;

-- =====================================================================
-- HOÀN TẤT - Test commands:
--   SELECT * FROM v_adapter_stats;
--   INSERT INTO ad_items (content, status) VALUES ('Test', 'FILTERED');
--   SELECT * FROM crawl_ads WHERE status = 'new';
-- =====================================================================
