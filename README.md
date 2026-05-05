# 🛰️ ZENITH SYSTEM DASHBOARD

<div align="center">
  <img src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" width="100%" alt="Zenith Banner" />
  <br/>
  <p align="center">
    <strong>Kiến Trúc Quản Trị Hệ Thống Modul Hóa Hiện Đại</strong>
    <br/>
    <i>Đồ Án Tốt Nghiệp - Hệ Thống Điều Hành & Phân Tích Dữ Liệu Thời Gian Thực</i>
  </p>

  [![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Firebase](https://img.shields.io/badge/Firebase-11.4-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
  [![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.0-ff0055?logo=framer&logoColor=white)](https://www.framer.com/motion/)
</div>

---

## 📖 Tổng Quan Dự Án

**Zenith System Dashboard** là một nền tảng quản trị công việc và phân tích hạ tầng được xây dựng dựa trên kiến trúc **Component-Based**. Dự án tập trung vào việc tối ưu hóa quy trình vận hành nhóm, cung cấp cái nhìn trực quan về hiệu suất và đảm bảo tính đồng bộ dữ liệu tức thì thông qua nền tảng Cloud.

### ✨ Tính Năng Cốt Lõi

- 📊 **Trung tâm Điều hành (Dashboard)**: Giám sát chỉ số Telemetry, năng suất và lịch trình vận hành Delta.
- 📋 **Bảng Kanban Modular**: Hệ thống quản lý công việc với cơ chế Kéo-Thả (Drag & Drop) mượt mà, phân loại ưu tiên thông minh.
- 📈 **Phân Tích Tài Nguyên (Metrics)**: Trực quan hóa dữ liệu hiệu suất 7 ngày thông qua biểu đồ SVG động.
- 📜 **Nhật Ký Hệ Thống (Logs)**: Live relay toàn bộ hoạt động của dự án với độ trễ cực thấp.
- 👥 **Quản Lý Đội Ngũ**: Phân quyền nhân sự (Admin, Developer, QA) và quản lý danh bạ thành viên.
- 🔒 **Bảo Mật Đa Tầng**: Hệ thống xác thực Google Auth và Security Rules chặt chẽ từ phía Server (Firebase).

---

## 🏗️ Kiến Trúc Hệ Thống (Modular Architecture)

Dự án được tái cấu trúc theo mô hình **Modular Next.js Style**, giúp tách biệt hoàn toàn Logic và Giao diện:

```text
src/
├── components/     # Các thành phần giao diện tái sử dụng
│   ├── kanban/     # Logic bảng điều khiển công việc
│   ├── layout/     # Sidebar, Topbar, MainLayout
│   ├── modals/     # Hệ thống cửa sổ chức năng popup
│   └── ui/         # Các nguyên tử giao diện (Cards, Buttons)
├── hooks/          # Logic nghiệp vụ (useAuth, useProjects, useProjectData)
├── pages/          # Các trang chức năng chính của hệ thống
├── lib/            # Cấu hình lõi (Firebase, Utils)
├── types/          # Định nghĩa kiểu dữ liệu (TypeScript Interfaces)
└── services/       # Các dịch vụ kết nối ngoại vi
```

---

## 🚀 Hướng Dẫn Cài Đặt

### Yêu Cầu Hệ Thống
- **Node.js**: v18.0.0 hoặc mới hơn
- **Trình duyệt**: Chrome, Edge hoặc Safari (Hỗ trợ tốt nhất cho hiệu ứng Glassmorphism)

### Các Bước Triển Khai

1. **Clone dự án và cài đặt thư viện:**
   ```bash
   npm install
   ```

2. **Cấu hình môi trường:**
   Tạo file `.env.local` từ mẫu `.env.example` và điền các thông số kết nối Firebase của bạn.

3. **Chạy ứng dụng trong môi trường phát triển:**
   ```bash
   npm run dev
   ```

4. **Biên dịch bản chính thức (Production Build):**
   ```bash
   npm run build
   ```

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS (Thiết kế Glassmorphism & Modern Minimalist)
- **State Management**: React Hooks & Custom Hooks Architecture
- **Backend-as-a-Service**: Firebase (Firestore, Authentication, Hosting)
- **Animation**: Framer Motion (Xử lý các chuyển động vật lý và Micro-interactions)

---

<div align="center">
  <p>© 2026 Zenith Dashboard. Sản phẩm thuộc Đồ án Tốt nghiệp - Thực hiện bởi <strong>Nguyễn Đức Anh</strong>.</p>
  <p>
    <a href="https://github.com/0x-anh">
      <img src="https://img.shields.io/badge/GitHub-0x--anh-black?style=for-the-badge&logo=github" alt="Author GitHub" />
    </a>
  </p>
</div>
