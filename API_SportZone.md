# SportZone – API Endpoints

> **Base URL:** `http://localhost:3000`
> **Auth:** Bearer JWT token trong header `Authorization: Bearer <token>`

---

## Phân quyền

| Ký hiệu | Ý nghĩa |
|---|---|
| 🔓 Public | Không cần đăng nhập |
| 🔒 Auth | Phải có JWT token |
| 👑 Admin | Phải có JWT token + `role = 'admin'` |

---

## 1. Auth

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/auth/register` | 🔓 | Đăng ký tài khoản mới |
| POST | `/auth/login` | 🔓 | Đăng nhập → trả về JWT token |
| GET | `/auth/me` | 🔒 | Lấy thông tin user đang đăng nhập |

### POST `/auth/register`
```json
{
  "full_name": "Nguyễn Văn A",
  "email": "user@example.com",
  "password": "User@123",
  "phone": "0909000001"
}
```

### POST `/auth/login`
```json
{
  "email": "user@example.com",
  "password": "User@123"
}
```
**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "uid": "...", "full_name": "...", "role": "customer" }
}
```

---

## 2. Users

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/users/:id` | 🔒 | Xem profile người dùng |
| PATCH | `/users/:id` | 🔒 | Cập nhật profile |
| GET | `/users/:id/addresses` | 🔒 | Danh sách địa chỉ giao hàng |
| POST | `/users/:id/addresses` | 🔒 | Thêm địa chỉ mới |
| PATCH | `/addresses/:id` | 🔒 | Sửa địa chỉ |
| DELETE | `/addresses/:id` | 🔒 | Xóa địa chỉ |

### POST `/users/:id/addresses`
```json
{
  "recipient_name": "Nguyễn Văn A",
  "phone": "0909000001",
  "street": "456 Lê Văn Việt",
  "ward": "Hiệp Phú",
  "district": "Quận 9",
  "city": "TP. Hồ Chí Minh",
  "is_default": true
}
```

---

## 3. Products

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/products` | 🔓 | Danh sách sản phẩm (filter + search) |
| GET | `/products/:id` | 🔓 | Chi tiết sản phẩm + variants |
| POST | `/products` | 👑 | Tạo sản phẩm mới |
| PATCH | `/products/:id` | 👑 | Cập nhật sản phẩm |
| DELETE | `/products/:id` | 👑 | Xóa sản phẩm |

### GET `/products` – Query params

| Param | Kiểu | Mô tả |
|---|---|---|
| `search` | string | Tìm theo tên sản phẩm |
| `category_id` | string | Lọc theo danh mục |
| `brand_id` | string | Lọc theo thương hiệu |
| `min_price` | number | Giá tối thiểu |
| `max_price` | number | Giá tối đa |
| `on_sale` | boolean | Chỉ lấy sản phẩm khuyến mãi |
| `in_stock` | boolean | Chỉ lấy sản phẩm còn hàng |
| `gender` | string | `men` / `women` / `unisex` |
| `page` | number | Trang (mặc định 1) |
| `limit` | number | Số lượng mỗi trang (mặc định 20) |

---

## 4. Categories & Brands

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/categories` | 🔓 | Danh sách danh mục |
| GET | `/brands` | 🔓 | Danh sách thương hiệu |

---

## 5. Cart

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/cart` | 🔒 | Xem giỏ hàng (kèm thông tin sản phẩm) |
| POST | `/cart/items` | 🔒 | Thêm sản phẩm vào giỏ |
| PATCH | `/cart/items/:id` | 🔒 | Thay đổi số lượng |
| DELETE | `/cart/items/:id` | 🔒 | Xóa 1 sản phẩm khỏi giỏ |
| DELETE | `/cart` | 🔒 | Xóa toàn bộ giỏ hàng |

### POST `/cart/items`
```json
{
  "product_id": "prd-001",
  "variant_id": "var-002",
  "quantity": 2
}
```

### PATCH `/cart/items/:id`
```json
{
  "quantity": 3
}
```

---

## 6. Orders

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/orders` | 🔒 | Tạo đơn hàng (checkout) |
| GET | `/orders` | 🔒 | Lịch sử đơn hàng của user |
| GET | `/orders/:id` | 🔒 | Chi tiết đơn hàng |
| PATCH | `/orders/:id/status` | 👑 | Cập nhật trạng thái đơn hàng |
| DELETE | `/orders/:id` | 🔒 | Hủy đơn hàng |

### POST `/orders`
```json
{
  "address_id": "addr-001",
  "payment_method": "cod",
  "note": "Giao giờ hành chính"
}
```
> App tự lấy cart của user hiện tại để tạo order, sau đó xóa cart.

### PATCH `/orders/:id/status` (Admin only)
```json
{
  "status": "confirmed"
}
```
**Các giá trị status hợp lệ:** `pending` → `confirmed` → `processing` → `shipping` → `delivered` → `completed` / `cancelled`

---

## 7. Notifications

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/notifications` | 🔒 | Danh sách thông báo của user |
| PATCH | `/notifications/:id/read` | 🔒 | Đánh dấu 1 thông báo đã đọc |
| PATCH | `/notifications/read-all` | 🔒 | Đánh dấu tất cả đã đọc |

---

## 8. Messages / Chat

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/messages` | 🔒 | Lấy lịch sử chat |
| POST | `/messages` | 🔒 | Gửi tin nhắn |

### POST `/messages`
```json
{
  "content": "Shop ơi size L còn hàng không?"
}
```
**Response:** Trả về tin nhắn vừa gửi + auto-reply từ bot nếu có.

---

## 9. Store Locations

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/stores` | 🔓 | Danh sách cửa hàng kèm tọa độ |

---

## Tổng kết

| Nhóm | Số endpoint | Ưu tiên |
|---|---|---|
| Auth | 3 | 🔴 Làm đầu tiên |
| Products | 5 | 🔴 Làm đầu tiên |
| Categories & Brands | 2 | 🔴 Làm đầu tiên |
| Cart | 5 | 🟡 Làm sau |
| Orders | 5 | 🟡 Làm sau |
| Users & Addresses | 6 | 🟡 Làm sau |
| Notifications | 3 | 🟢 Làm cuối |
| Messages | 2 | 🟢 Làm cuối |
| Stores | 1 | 🟢 Làm cuối |
| **Tổng** | **32** | |
