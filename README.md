# Smart Parking Tracker (React Native / Expo)

Ứng dụng hỗ trợ ghi nhớ vị trí đỗ xe thông minh, điều hướng tìm xe theo thời gian thực và quản lý nhật ký lịch sử đỗ xe trên nền tảng React Native (Expo).

---

## 🛠️ Hướng dẫn cài đặt & Chạy ứng dụng

```bash
# 1. Chuyển vào thư mục dự án
cd SmartParkingTracker

# 2. Khởi chạy Expo Server
npx expo start
```

---

## ✨ Danh sách tính năng cốt lõi

1. **Lưu vị trí đỗ xe linh hoạt (Check-In):**
   - Lấy tọa độ GPS tự động từ thiết bị với độ chính xác cao.
   - Hỗ trợ kéo ghim hoặc chạm trực tiếp trên bản đồ MapView để tinh chỉnh vị trí theo ý muốn.
   - Dịch ngược tọa độ sang tên đường, quận/huyện, thành phố (Reverse Geocoding).
   - Nút định vị tức thời đưa ghim trở lại vị trí GPS người dùng.
   - Nhập thông tin Tầng, Khu vực, Số ô đỗ và Ghi chú (kèm bộ đếm ký tự 200).
   - Chụp ảnh ô đỗ qua Camera và lưu trữ nội bộ bằng `expo-file-system`.

2. **Bảng điều khiển trung tâm (Dashboard):**
   - Bản đồ trực quan hiển thị vị trí xe đang đỗ và vị trí người dùng.
   - Thẻ thông tin phiên đỗ đang hoạt động.
   - Các tác vụ nhanh: Chỉ đường, Xem chi tiết, La bàn tìm xe, Chia sẻ vị trí, Đã lấy xe.
   - Trạng thái trống (Vacant state) khi chưa có xe đỗ kèm nút Check-In.

3. **Ra-đa & La bàn tìm xe (Radar / Compass):**
   - Tự động theo dõi tọa độ GPS và cảm biến từ trường (Heading) thời gian thực.
   - Tính khoảng cách trắc địa (Haversine formula) và góc phương vị (Azimuth bearing).
   - Kim la bàn xoay chỉ thẳng hướng tới xe theo thời gian thực.
   - Cảnh báo tiếp cận: Khi khoảng cách $\le$ 10 mét, ứng dụng hiển thị thông báo "Bạn đã ở rất gần xe!".
   - Hiển thị chỉ số độ chính xác la bàn và sai số GPS.

4. **Chỉ đường & Chia sẻ mạng xã hội:**
   - Mở bản đồ chỉ đường gốc của hệ thống (Google Maps trên Android, Apple Maps trên iOS) hoặc fallback web.
   - Chia sẻ vị trí xe dạng văn bản + hyperlink vị trí qua Native Share Sheet (Zalo, Messenger, Tin nhắn, v.v.).

5. **Chi tiết & Lịch sử đỗ xe (Logbook):**
   - Xem lại đầy đủ lịch sử các phiên đỗ đã hoàn tất.
   - Xem chi tiết bản đồ, ảnh chụp, các thông số ô đỗ và mốc thời gian lưu / lấy xe.
   - Hỗ trợ kích hoạt lại một phiên cũ thành phiên xe đang đỗ hiện tại.
   - Xóa từng bản ghi hoặc xóa toàn bộ lịch sử trong phần Cài đặt.

6. **Thiết lập & Cài đặt hệ thống (Preferences):**
   - Thống kê tổng số phiên đỗ đã hoàn thành.
   - Xóa sạch toàn bộ lịch sử và dọn dẹp các ảnh chụp đính kèm an toàn.
