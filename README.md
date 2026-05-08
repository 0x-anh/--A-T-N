# 🛰️ ZENITH SYSTEM DASHBOARD

<div align="center">
  <img src="https://i.ibb.co/wNgLwPwb/Chat-GPT-Image-03-13-51-7-thg-5-2026.png" width="100%" alt="Zenith Banner" />
  <br/>
  <p align="center">
    <strong>Kỷ Nguyên Quản Trị Hệ Thống Modul Hóa Đột Phá</strong>
    <br/>
    <i>Hệ Thống Điều Hành & Phân Tích Dữ Liệu Thời Gian Thực - NDA STRATEGIC DASHBOARD</i>
  </p>

  [![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
  [![Next.js](https://img.shields.io/badge/Next.js-15.3-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
  [![Firebase](https://img.shields.io/badge/Firebase-11.4-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
  [![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.0-ff0055?logo=framer&logoColor=white)](https://www.framer.com/motion/)
</div>

---

## 📖 1. Giới thiệu dự án

**Zenith Dashboard** là hệ thống web hỗ trợ quản lý dự án và quy trình xử lý lỗi phần mềm theo mô hình **Kanban**. Ứng dụng được xây dựng nhằm phục vụ bài toán theo dõi vòng đời của lỗi phần mềm từ lúc phát hiện, tạo báo cáo lỗi, phân công người xử lý, cập nhật trạng thái, kiểm tra lại cho đến khi hoàn tất.

Hệ thống hướng đến việc hỗ trợ các nhóm phát triển phần mềm quy mô nhỏ đến trung bình, giúp chuẩn hóa quy trình xử lý lỗi, tăng khả năng phối hợp giữa các thành viên và nâng cao hiệu quả giám sát tiến độ công việc.

---

## ✨ 2. Tính năng chính

Hệ thống cung cấp các nhóm tính năng cốt lõi sau:

### 📊 2.1. Dashboard & Thống kê
- **Tổng quan hệ thống**: Hiển thị nhanh các chỉ số quan trọng (tổng số lỗi, lỗi đang mở, lỗi đã xử lý, tỉ lệ hoàn thành).
- **Phân tích biểu đồ**: Trực quan hóa dữ liệu lỗi theo thời gian (biểu đồ đường) và theo trạng thái (biểu đồ tròn).
- **Cảnh báo lỗi quá hạn**: Tự động nhận diện và liệt kê các lỗi đã quá hạn xử lý (Deadline).

### 📋 2.2. Quản lý lỗi (Issue Management)
- **Bảng Kanban**: Kéo thả linh hoạt giữa các trạng thái: *Backlog*, *In Progress*, *In Review*, *Done*.
- **Chi tiết lỗi**: Hỗ trợ ghi chú tiêu đề, mô tả chi tiết, mức độ ưu tiên, deadline và phân công người phụ trách.
- **Tương tác**: Cho phép bình luận (Comment) và theo dõi lịch sử thay đổi của từng lỗi.

### 👤 2.3. Quản lý người dùng & Phân quyền Realtime
- **Xác thực**: Đăng nhập bằng Google Auth qua Firebase.
- **Hệ thống Vai trò (Roles)**: 
  - **Editor**: Thực hiện nhiệm vụ, cập nhật tiến độ.
  - **Tester**: Kiểm tra chất lượng, phê duyệt hoặc bác bỏ kết quả.
  - **Viewer**: Theo dõi dữ liệu mà không có quyền chỉnh sửa.
- **Thông báo Realtime**: Người dùng nhận được thông báo ngay lập tức khi được cấp quyền mới hoặc phân công nhiệm vụ mới mà không cần tải lại trang.

### 🟢 2.4. Giám sát trạng thái hoạt động (Realtime Presence)
- **Online/Offline Tracking**: Tự động nhận diện trạng thái hoạt động của từng nhân sự trong dự án.
- **Độ phủ dự án**: Thống kê tỉ lệ nhân sự đang trực tuyến thời gian thực để đánh giá khả năng vận hành của Node dự án.

---

## 🏗️ 3. Kiến trúc kỹ thuật

Dự án được phát triển theo mô hình **Single Page Application (SPA)** hiện đại:

- **Frontend Framework**: [React 19](https://reactjs.org/) kết hợp [Next.js 15](https://nextjs.org/).
- **Ngôn ngữ**: [TypeScript](https://www.typescriptlang.org/) đảm bảo tính chặt chẽ của mã nguồn.
- **Giao diện**: [Tailwind CSS](https://tailwindcss.com/) & [Lucide React Icons](https://lucide.dev/).
- **Hiệu ứng**: [Framer Motion](https://www.framer.com/motion/) tạo trải nghiệm mượt mượt.
- **Backend-as-a-Service**: [Firebase](https://firebase.google.com/) (Firestore cho DB, Auth cho người dùng).

---

## 🏗️ 4. Cấu trúc mã nguồn (Modular Architecture)

Dự án được thiết kế theo tư duy **Modul hóa (Modular Design)**, giúp tách biệt hoàn toàn giữa giao diện (UI), logic nghiệp vụ (Business Logic) và cấu hình hệ thống. Điều này giúp mã nguồn dễ dàng bảo trì, mở rộng và kiểm thử.

### 📂 Sơ đồ tổ chức thư mục:

```text
src/
├── app/            # Next.js App Router (Routing, Layout toàn cục & Global Styles)
├── components/     # Các thành phần giao diện (UI Components) tái sử dụng
│   ├── kanban/     # Logic và giao diện riêng cho bảng điều hành công việc
│   ├── layout/     # Các thành phần khung: Sidebar, Topbar, MainLayout
│   ├── modals/     # Hệ thống cửa sổ chức năng (Project, Invite, Settings...)
│   └── ui/         # Nguyên tử giao diện cơ bản: Buttons, Cards, Inputs...
├── hooks/          # Custom Hooks (Xử lý logic Auth, Real-time Data, Projects)
├── locales/        # Đa ngôn ngữ (i18n): Chứa các tệp bản dịch Tiếng Anh & Tiếng Việt
├── pages/          # Thành phần giao diện chính của từng phân hệ (Dashboard, Metrics...)
├── lib/            # Cấu hình lõi (Khởi tạo Firebase, các tệp Utility dùng chung)
├── types/          # Định nghĩa kiểu dữ liệu (TypeScript Interfaces & Types)
└── services/       # Các dịch vụ kết nối API và xử lý dữ liệu ngoại vi
```

---

## 🚀 5. Cài đặt và chạy dự án

### 5.1. Yêu cầu môi trường
- Node.js phiên bản 18 trở lên
- NPM
- Kết nối tới dự án Firebase

### 5.2. Các bước thực hiện
1. **Cài đặt thư viện**: `npm install`
2. **Chạy môi trường phát triển**: `npm run dev`
3. **Truy cập**: `http://localhost:3000`

---

## 🛠️ 6. Đặc điểm nổi bật

- 💎 **Giao diện Glassmorphism**: Thiết kế hiện đại, tinh tế với hiệu ứng kính mờ.
- ⚡ **Real-time Sync**: Dữ liệu đồng bộ tức thì trên mọi thiết bị nhờ Firebase Firestore.
- 🟢 **Presence System**: Giám sát trạng thái hoạt động của nhân sự thời gian thực.
- 📱 **Responsive Design**: Hoạt động hoàn hảo trên cả Mobile và Desktop.
- 🌐 **Bilingual Support**: Hỗ trợ đa ngôn ngữ Tiếng Anh & Tiếng Việt (i18n).

---

<div align="center">
  <p>© 2026 Zenith Dashboard. Sản phẩm thuộc Đồ án Tốt nghiệp - Thực hiện bởi <strong>Nguyễn Đức Anh</strong>.</p>
  <p>
    <a href="https://github.com/0x-anh">
      <img src="https://img.shields.io/badge/GitHub-0x--anh-black?style=for-the-badge&logo=github" alt="Author GitHub" />
    </a>
  </p>
</div>