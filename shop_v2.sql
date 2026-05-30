-- ============================================================
--  SPORTSWEAR SHOP – PostgreSQL Schema
--  App: Flutter | State: Provider / Bloc | Backend: NestJS
--  Version: 2.0 – Thêm password_hash, role vào users
-- ============================================================

-- Bật extension tạo UUID tự động
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
--  1. USERS
-- ============================================================
CREATE TABLE users (
    uid                 VARCHAR(36)     PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    full_name           VARCHAR(100)    NOT NULL,
    email               VARCHAR(150)    NOT NULL UNIQUE,
    password_hash       TEXT            NOT NULL,
    phone               VARCHAR(20),
    avatar_url          TEXT,
    role                TEXT            NOT NULL DEFAULT 'customer'
                            CHECK (role IN ('customer', 'admin')),
    default_address_id  VARCHAR(36),                        -- FK thêm sau (circular dep)
    is_active           BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  2. ADDRESSES
-- ============================================================
CREATE TABLE addresses (
    address_id      VARCHAR(36)     PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    uid             VARCHAR(36)     NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    recipient_name  VARCHAR(100)    NOT NULL,
    phone           VARCHAR(20)     NOT NULL,
    street          VARCHAR(255)    NOT NULL,
    ward            VARCHAR(100),                           -- Phường/Xã
    district        VARCHAR(100)    NOT NULL,
    city            VARCHAR(100)    NOT NULL DEFAULT 'TP. Hồ Chí Minh',
    is_default      BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Thêm FK default_address_id sau khi addresses đã tồn tại
ALTER TABLE users
    ADD CONSTRAINT fk_users_default_address
    FOREIGN KEY (default_address_id) REFERENCES addresses(address_id) ON DELETE SET NULL;

-- ============================================================
--  3. CATEGORIES
-- ============================================================
CREATE TABLE categories (
    category_id     VARCHAR(36)     PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name            VARCHAR(100)    NOT NULL,               -- Áo, Quần, Giày, Phụ kiện…
    slug            VARCHAR(100)    NOT NULL UNIQUE,        -- ao-the-thao, quan-the-thao…
    icon_url        TEXT,
    display_order   SMALLINT        NOT NULL DEFAULT 0,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  4. BRANDS
-- ============================================================
CREATE TABLE brands (
    brand_id        VARCHAR(36)     PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name            VARCHAR(100)    NOT NULL UNIQUE,        -- Nike, Adidas, Puma…
    logo_url        TEXT,
    country         VARCHAR(100),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  5. PRODUCTS
-- ============================================================
CREATE TABLE products (
    product_id      VARCHAR(36)     PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    category_id     VARCHAR(36)     NOT NULL REFERENCES categories(category_id),
    brand_id        VARCHAR(36)     NOT NULL REFERENCES brands(brand_id),
    name            VARCHAR(200)    NOT NULL,
    description     TEXT,
    price           NUMERIC(12,0)   NOT NULL CHECK (price >= 0),    -- VNĐ
    sale_price      NUMERIC(12,0)            CHECK (sale_price >= 0),
    images          TEXT[]          NOT NULL DEFAULT '{}',           -- mảng URL ảnh
    material        VARCHAR(200),                                    -- Cotton, Polyester…
    gender          VARCHAR(10)     NOT NULL DEFAULT 'unisex'
                        CHECK (gender IN ('men','women','unisex')),
    origin          VARCHAR(100),                                    -- Xuất xứ
    warranty_info   TEXT,                                           -- Chính sách bảo hành
    total_stock     INTEGER         NOT NULL DEFAULT 0 CHECK (total_stock >= 0),
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  6. PRODUCT VARIANTS  (mỗi combo size + màu = 1 SKU)
-- ============================================================
CREATE TABLE product_variants (
    variant_id      VARCHAR(36)     PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    product_id      VARCHAR(36)     NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    size            VARCHAR(10)     NOT NULL CHECK (size IN ('XS','S','M','L','XL','XXL','XXXL','FREE')),
    color_name      VARCHAR(50)     NOT NULL,                -- Đen, Trắng, Đỏ…
    color_hex       VARCHAR(7),                              -- #FF0000
    sku             VARCHAR(100)    NOT NULL UNIQUE,         -- Mã hàng nội bộ
    stock_qty       INTEGER         NOT NULL DEFAULT 0 CHECK (stock_qty >= 0),
    extra_price     NUMERIC(12,0)   NOT NULL DEFAULT 0,      -- Phụ phí thêm / giảm so với base
    image_url       TEXT,                                    -- Ảnh riêng theo màu (optional)
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, size, color_name)
);

-- ============================================================
--  7. CARTS
-- ============================================================
CREATE TABLE carts (
    cart_id         VARCHAR(36)     PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    uid             VARCHAR(36)     NOT NULL UNIQUE REFERENCES users(uid) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  8. CART ITEMS
-- ============================================================
CREATE TABLE cart_items (
    item_id         VARCHAR(36)     PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    cart_id         VARCHAR(36)     NOT NULL REFERENCES carts(cart_id) ON DELETE CASCADE,
    product_id      VARCHAR(36)     NOT NULL REFERENCES products(product_id),
    variant_id      VARCHAR(36)     NOT NULL REFERENCES product_variants(variant_id),
    quantity        INTEGER         NOT NULL DEFAULT 1 CHECK (quantity >= 1),
    unit_price      NUMERIC(12,0)   NOT NULL,                -- Snapshot giá tại thời điểm thêm
    added_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    UNIQUE (cart_id, variant_id)                             -- Mỗi variant chỉ 1 dòng trong giỏ
);

-- ============================================================
--  9. ORDERS
-- ============================================================
CREATE TYPE order_status AS ENUM (
    'pending',      -- Chờ xác nhận
    'confirmed',    -- Đã xác nhận
    'processing',   -- Đang chuẩn bị hàng
    'shipping',     -- Đang giao hàng
    'delivered',    -- Đã giao
    'completed',    -- Hoàn tất
    'cancelled'     -- Đã hủy
);

CREATE TYPE payment_method AS ENUM (
    'cod',           -- Thanh toán khi nhận hàng
    'bank_transfer', -- Chuyển khoản ngân hàng
    'e_wallet'       -- Ví điện tử (Momo, ZaloPay…)
);

CREATE TABLE orders (
    order_id        VARCHAR(36)     PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    uid             VARCHAR(36)     NOT NULL REFERENCES users(uid),
    address_id      VARCHAR(36)     NOT NULL REFERENCES addresses(address_id),
    status          order_status    NOT NULL DEFAULT 'pending',
    payment_method  payment_method  NOT NULL DEFAULT 'cod',
    subtotal        NUMERIC(12,0)   NOT NULL CHECK (subtotal >= 0),
    shipping_fee    NUMERIC(12,0)   NOT NULL DEFAULT 0 CHECK (shipping_fee >= 0),
    discount        NUMERIC(12,0)   NOT NULL DEFAULT 0 CHECK (discount >= 0),
    total           NUMERIC(12,0)   NOT NULL CHECK (total >= 0),
    note            TEXT,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  10. ORDER ITEMS
-- ============================================================
CREATE TABLE order_items (
    item_id         VARCHAR(36)     PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    order_id        VARCHAR(36)     NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    product_id      VARCHAR(36)     NOT NULL REFERENCES products(product_id),
    variant_id      VARCHAR(36)     NOT NULL REFERENCES product_variants(variant_id),
    -- Snapshot dữ liệu tại thời điểm đặt hàng (quan trọng!)
    product_name    VARCHAR(200)    NOT NULL,
    brand_name      VARCHAR(100)    NOT NULL,
    size            VARCHAR(10)     NOT NULL,
    color_name      VARCHAR(50)     NOT NULL,
    image_url       TEXT,
    quantity        INTEGER         NOT NULL CHECK (quantity >= 1),
    unit_price      NUMERIC(12,0)   NOT NULL,
    line_total      NUMERIC(12,0)   GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- ============================================================
--  11. NOTIFICATIONS
-- ============================================================
CREATE TYPE notification_type AS ENUM (
    'order_confirmed',
    'order_shipping',
    'order_delivered',
    'order_cancelled',
    'promotion',
    'new_product',
    'system'
);

CREATE TABLE notifications (
    notif_id        VARCHAR(36)     PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    uid             VARCHAR(36)     NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    type            notification_type NOT NULL DEFAULT 'system',
    title           VARCHAR(200)    NOT NULL,
    body            TEXT            NOT NULL,
    ref_id          VARCHAR(36),                             -- order_id hoặc product_id
    ref_type        VARCHAR(20),                             -- 'order' | 'product'
    is_read         BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  12. MESSAGES (Chat khách hàng ↔ cửa hàng)
-- ============================================================
CREATE TYPE sender_role AS ENUM ('customer', 'store');

CREATE TABLE messages (
    msg_id          VARCHAR(36)     PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    uid             VARCHAR(36)     NOT NULL REFERENCES users(uid) ON DELETE CASCADE,
    sender_role     sender_role     NOT NULL DEFAULT 'customer',
    content         TEXT            NOT NULL CHECK (TRIM(content) <> ''),
    is_bot          BOOLEAN         NOT NULL DEFAULT FALSE,  -- TRUE nếu là auto-reply
    is_read         BOOLEAN         NOT NULL DEFAULT FALSE,
    sent_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  13. STORE LOCATIONS
-- ============================================================
CREATE TABLE store_locations (
    store_id        VARCHAR(36)     PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    name            VARCHAR(200)    NOT NULL,
    address         TEXT            NOT NULL,
    lat             DOUBLE PRECISION NOT NULL,
    lng             DOUBLE PRECISION NOT NULL,
    phone           VARCHAR(20),
    open_time       TIME            NOT NULL DEFAULT '08:00',
    close_time      TIME            NOT NULL DEFAULT '21:00',
    image_url       TEXT,
    is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- ============================================================
--  INDEXES (tăng tốc query thường dùng)
-- ============================================================
-- Products
CREATE INDEX idx_products_category    ON products(category_id);
CREATE INDEX idx_products_brand       ON products(brand_id);
CREATE INDEX idx_products_is_active   ON products(is_active);
CREATE INDEX idx_products_name        ON products USING gin(to_tsvector('simple', name));
CREATE INDEX idx_products_sale        ON products(sale_price) WHERE sale_price IS NOT NULL;

-- Variants
CREATE INDEX idx_variants_product     ON product_variants(product_id);
CREATE INDEX idx_variants_sku         ON product_variants(sku);

-- Cart items
CREATE INDEX idx_cart_items_cart      ON cart_items(cart_id);
CREATE INDEX idx_cart_items_variant   ON cart_items(variant_id);

-- Orders
CREATE INDEX idx_orders_uid           ON orders(uid);
CREATE INDEX idx_orders_status        ON orders(status);
CREATE INDEX idx_orders_created       ON orders(created_at DESC);

-- Order items
CREATE INDEX idx_order_items_order    ON order_items(order_id);

-- Notifications
CREATE INDEX idx_notif_uid_unread     ON notifications(uid, is_read);
CREATE INDEX idx_notif_created        ON notifications(created_at DESC);

-- Messages
CREATE INDEX idx_messages_uid         ON messages(uid);
CREATE INDEX idx_messages_sent        ON messages(sent_at DESC);

-- Addresses
CREATE INDEX idx_addresses_uid        ON addresses(uid);

-- ============================================================
--  TRIGGERS – tự động cập nhật updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_products_updated
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_carts_updated
    BEFORE UPDATE ON carts
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER trg_orders_updated
    BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================
--  TRIGGER – đồng bộ total_stock của products
--  Khi stock_qty của variant thay đổi → cập nhật lại tổng
-- ============================================================
CREATE OR REPLACE FUNCTION sync_product_total_stock()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        UPDATE products
        SET total_stock = (
            SELECT COALESCE(SUM(stock_qty), 0)
            FROM product_variants
            WHERE product_id = OLD.product_id AND is_active = TRUE
        ),
        updated_at = NOW()
        WHERE product_id = OLD.product_id;
        RETURN OLD;
    ELSE
        UPDATE products
        SET total_stock = (
            SELECT COALESCE(SUM(stock_qty), 0)
            FROM product_variants
            WHERE product_id = NEW.product_id AND is_active = TRUE
        ),
        updated_at = NOW()
        WHERE product_id = NEW.product_id;
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_total_stock
    AFTER INSERT OR UPDATE OF stock_qty OR DELETE ON product_variants
    FOR EACH ROW EXECUTE FUNCTION sync_product_total_stock();

-- ============================================================
--  SEED DATA – Dữ liệu mẫu
-- ============================================================

-- Users (password đã bcrypt hash)
-- admin@sportzone.com → Admin@123
-- user@sportzone.com  → User@123
INSERT INTO users (uid, full_name, email, password_hash, phone, role) VALUES
    ('admin-001', 'Admin SportZone', 'admin@sportzone.com',
     '$2b$10$hQUuXeJM2aWBxr3QkAnkZuV.eMPpKFhT8dBMKfPnZ31.V3qQHac5.',
     '0909000001', 'admin'),
    ('user-001',  'Nguyễn Văn A',   'user@sportzone.com',
     '$2b$10$gX06VAC7n0VkHL4pjvJSfO5Gj1S578sgfGP6v2ZujhW/xdAsDerL.',
     '0909000002', 'customer');

-- Categories
INSERT INTO categories (category_id, name, slug, display_order) VALUES
    ('cat-001', 'Áo thể thao',    'ao-the-thao',   1),
    ('cat-002', 'Quần thể thao',  'quan-the-thao', 2),
    ('cat-003', 'Giày thể thao',  'giay-the-thao', 3),
    ('cat-004', 'Phụ kiện',       'phu-kien',       4),
    ('cat-005', 'Áo khoác',       'ao-khoac',       5);

-- Brands
INSERT INTO brands (brand_id, name, country) VALUES
    ('brd-001', 'Nike',          'USA'),
    ('brd-002', 'Adidas',        'Germany'),
    ('brd-003', 'Puma',          'Germany'),
    ('brd-004', 'Under Armour',  'USA'),
    ('brd-005', 'New Balance',   'USA'),
    ('brd-006', 'Lining',        'China');

-- Products
INSERT INTO products (product_id, category_id, brand_id, name, description, price, sale_price, images, material, gender, origin, warranty_info) VALUES
    ('prd-001', 'cat-001', 'brd-001',
     'Áo thun Nike Dri-FIT Training',
     'Áo thun thể thao công nghệ Dri-FIT giúp thấm hút mồ hôi nhanh, giữ cơ thể khô ráo suốt buổi tập.',
     450000, 380000,
     ARRAY['https://example.com/img/nike-tshirt-1.jpg','https://example.com/img/nike-tshirt-2.jpg'],
     'Polyester 100%', 'men', 'Việt Nam', '6 tháng – Lỗi nhà sản xuất'),

    ('prd-002', 'cat-002', 'brd-002',
     'Quần short Adidas Tiro 23',
     'Quần short thi đấu chính hãng Adidas, chất liệu nhẹ thoáng, co giãn 4 chiều.',
     520000, NULL,
     ARRAY['https://example.com/img/adidas-short-1.jpg'],
     'Polyester 95%, Elastane 5%', 'men', 'Cambodia', '6 tháng – Lỗi nhà sản xuất'),

    ('prd-003', 'cat-001', 'brd-003',
     'Áo thun Puma Essential Logo',
     'Áo thun basic phong cách thể thao, logo Puma nổi bật, phù hợp mặc tập và dạo phố.',
     350000, 299000,
     ARRAY['https://example.com/img/puma-tshirt-1.jpg'],
     'Cotton 60%, Polyester 40%', 'unisex', 'Việt Nam', '3 tháng – Lỗi nhà sản xuất'),

    ('prd-004', 'cat-002', 'brd-004',
     'Quần dài Under Armour HeatGear',
     'Quần dài tập gym công nghệ HeatGear, ôm vừa vặn, thoáng khí tối đa.',
     780000, 650000,
     ARRAY['https://example.com/img/ua-pants-1.jpg'],
     'Nylon 84%, Elastane 16%', 'women', 'Indonesia', '6 tháng – Lỗi nhà sản xuất'),

    ('prd-005', 'cat-005', 'brd-001',
     'Áo khoác Nike Windrunner',
     'Áo khoác gió nhẹ, chắn gió tốt, thiết kế gọn nhẹ có thể gấp vào túi.',
     1200000, 990000,
     ARRAY['https://example.com/img/nike-jacket-1.jpg','https://example.com/img/nike-jacket-2.jpg'],
     'Nylon 100%', 'unisex', 'Việt Nam', '6 tháng – Lỗi nhà sản xuất');

-- Product Variants
INSERT INTO product_variants (variant_id, product_id, size, color_name, color_hex, sku, stock_qty) VALUES
    -- Nike Dri-FIT
    ('var-001', 'prd-001', 'S',  'Đen',   '#000000', 'NK-DRI-BLK-S',  10),
    ('var-002', 'prd-001', 'M',  'Đen',   '#000000', 'NK-DRI-BLK-M',  15),
    ('var-003', 'prd-001', 'L',  'Đen',   '#000000', 'NK-DRI-BLK-L',  12),
    ('var-004', 'prd-001', 'XL', 'Đen',   '#000000', 'NK-DRI-BLK-XL',  8),
    ('var-005', 'prd-001', 'M',  'Trắng', '#FFFFFF', 'NK-DRI-WHT-M',  20),
    ('var-006', 'prd-001', 'L',  'Trắng', '#FFFFFF', 'NK-DRI-WHT-L',  18),
    -- Adidas Tiro
    ('var-007', 'prd-002', 'S',  'Đen',   '#000000', 'AD-TIR-BLK-S',   8),
    ('var-008', 'prd-002', 'M',  'Đen',   '#000000', 'AD-TIR-BLK-M',  14),
    ('var-009', 'prd-002', 'L',  'Xanh',  '#1565C0', 'AD-TIR-BLU-L',  10),
    -- Puma Essential
    ('var-010', 'prd-003', 'S',  'Xám',   '#9E9E9E', 'PM-ESS-GRY-S',  12),
    ('var-011', 'prd-003', 'M',  'Xám',   '#9E9E9E', 'PM-ESS-GRY-M',  16),
    ('var-012', 'prd-003', 'L',  'Đỏ',    '#D32F2F', 'PM-ESS-RED-L',   9),
    ('var-013', 'prd-003', 'XL', 'Đỏ',    '#D32F2F', 'PM-ESS-RED-XL',  0), -- hết hàng
    -- Under Armour
    ('var-014', 'prd-004', 'S',  'Đen',   '#000000', 'UA-HEG-BLK-S',   7),
    ('var-015', 'prd-004', 'M',  'Đen',   '#000000', 'UA-HEG-BLK-M',  11),
    -- Nike Windrunner
    ('var-016', 'prd-005', 'M',  'Xanh',  '#0D47A1', 'NK-WIN-BLU-M',   6),
    ('var-017', 'prd-005', 'L',  'Xanh',  '#0D47A1', 'NK-WIN-BLU-L',   9),
    ('var-018', 'prd-005', 'L',  'Đỏ',    '#B71C1C', 'NK-WIN-RED-L',   5);

-- Store Locations
INSERT INTO store_locations (store_id, name, address, lat, lng, phone, open_time, close_time) VALUES
    ('sto-001',
     'Sport Store – Quận 9',
     '456 Lê Văn Việt, Phường Hiệp Phú, Quận 9, TP. HCM',
     10.8479, 106.7725,
     '0909 123 456',
     '08:00', '21:00'),
    ('sto-002',
     'Sport Store – Quận 1',
     '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. HCM',
     10.7769, 106.7009,
     '0909 654 321',
     '08:00', '22:00');

-- ============================================================
--  VIEWS hữu ích
-- ============================================================

-- View: Sản phẩm kèm tên danh mục và thương hiệu
CREATE OR REPLACE VIEW v_products_full AS
SELECT
    p.product_id,
    p.name                  AS product_name,
    c.name                  AS category_name,
    b.name                  AS brand_name,
    p.price,
    p.sale_price,
    CASE WHEN p.sale_price IS NOT NULL
         THEN ROUND((1 - p.sale_price::NUMERIC / p.price) * 100)
         ELSE 0
    END                     AS discount_pct,
    p.images[1]             AS thumbnail,
    p.gender,
    p.material,
    p.total_stock,
    p.is_active,
    p.created_at
FROM products p
JOIN categories c ON c.category_id = p.category_id
JOIN brands     b ON b.brand_id     = p.brand_id
WHERE p.is_active = TRUE;

-- View: Tổng tiền giỏ hàng theo user
CREATE OR REPLACE VIEW v_cart_summary AS
SELECT
    c.cart_id,
    c.uid,
    COUNT(ci.item_id)                   AS item_count,
    SUM(ci.quantity * ci.unit_price)    AS subtotal
FROM carts c
LEFT JOIN cart_items ci ON ci.cart_id = c.cart_id
GROUP BY c.cart_id, c.uid;

-- View: Đơn hàng kèm địa chỉ giao hàng
CREATE OR REPLACE VIEW v_orders_detail AS
SELECT
    o.order_id,
    o.uid,
    o.status,
    o.payment_method,
    o.subtotal,
    o.shipping_fee,
    o.discount,
    o.total,
    o.note,
    o.created_at,
    a.recipient_name,
    a.phone         AS recipient_phone,
    (a.street || ', ' || a.district || ', ' || a.city) AS full_address
FROM orders o
JOIN addresses a ON a.address_id = o.address_id;

-- ============================================================
--  QUERIES MẪU (để tham khảo)
-- ============================================================

-- [1] Tìm kiếm sản phẩm theo tên, lọc theo brand, category, khoảng giá
/*
SELECT * FROM v_products_full
WHERE
    to_tsvector('simple', product_name) @@ plainto_tsquery('simple', 'nike dri-fit')
    AND brand_name = 'Nike'
    AND category_name = 'Áo thể thao'
    AND COALESCE(sale_price, price) BETWEEN 200000 AND 600000
    AND total_stock > 0
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
*/

-- [2] Lấy chi tiết sản phẩm + tất cả variants còn hàng
/*
SELECT p.*, pv.*
FROM products p
JOIN product_variants pv ON pv.product_id = p.product_id
WHERE p.product_id = 'prd-001'
  AND pv.is_active = TRUE
ORDER BY pv.size, pv.color_name;
*/

-- [3] Lấy giỏ hàng của user kèm thông tin sản phẩm
/*
SELECT
    ci.item_id, ci.quantity, ci.unit_price,
    ci.quantity * ci.unit_price AS line_total,
    p.name AS product_name,
    b.name AS brand_name,
    pv.size, pv.color_name,
    p.images[1] AS thumbnail
FROM carts c
JOIN cart_items ci       ON ci.cart_id    = c.cart_id
JOIN product_variants pv ON pv.variant_id = ci.variant_id
JOIN products p          ON p.product_id  = ci.product_id
JOIN brands b            ON b.brand_id    = p.brand_id
WHERE c.uid = 'USER_UID_HERE';
*/

-- [4] Tạo đơn hàng (transaction)
/*
BEGIN;
    INSERT INTO orders (uid, address_id, payment_method, subtotal, shipping_fee, total)
    VALUES ('USER_UID', 'ADDRESS_ID', 'cod', 830000, 30000, 860000);

    INSERT INTO order_items (order_id, product_id, variant_id, product_name, brand_name, size, color_name, quantity, unit_price)
    VALUES ('ORDER_ID', 'prd-001', 'var-002', 'Áo thun Nike Dri-FIT Training', 'Nike', 'M', 'Đen', 2, 380000);

    UPDATE product_variants SET stock_qty = stock_qty - 2 WHERE variant_id = 'var-002';

    DELETE FROM cart_items WHERE cart_id = 'CART_ID';
COMMIT;
*/

-- [5] Đánh dấu tất cả thông báo đã đọc
/*
UPDATE notifications SET is_read = TRUE WHERE uid = 'USER_UID' AND is_read = FALSE;
*/

-- [6] Lấy lịch sử chat của user
/*
SELECT msg_id, sender_role, content, is_bot, sent_at, is_read
FROM messages
WHERE uid = 'USER_UID'
ORDER BY sent_at ASC;
*/

-- ============================================================
--  END OF SCHEMA
-- ============================================================
