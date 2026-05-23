<div align="center">

# ⬇️ حمّل وانجز | Hammel w Engez

### أداة تحميل ذكية من أي رابط — بضغطة واحدة
### Smart universal download tool — paste any URL and download instantly

[![Live Demo](https://img.shields.io/badge/Live-Demo-0a5c5c?style=for-the-badge&logo=vercel&logoColor=white)](https://hammel-w-engez.vercel.app)
[![GitHub](https://img.shields.io/badge/GitHub-Repository-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/ziadamr45/Hammel-w-Engez)

</div>

---

## 📖 نبذة | Overview

<div dir="rtl">

**حمّل وانجز** هو تطبيق ويب متكامل لتحميل أي ملف من أي رابط بسهولة وسرعة. سواء كان فيديو، صوت، صورة، أو أي ملف آخر — فقط الصق الرابط وحمّل فورًا. التطبيق يدعم التحميل المتعدد (Batch Download) ويحلل الرابط تلقائيًا ليظهر لك معلومات الملف قبل التحميل.

صُمم التطبيق ليكون سريع الاستجابة، آمن، وسهل الاستخدام مع واجهة عربية أنيقة تدعم الوضع الداكن والفاتح.

</div>

**Hammel w Engez** is a full-featured web application for downloading any file from any URL with a single click. Whether it's a video, audio, image, or any other file — just paste the link and download instantly. The app supports batch downloading and automatically analyzes the URL to show file information before downloading.

Built with a focus on speed, security, and ease of use with a beautiful Arabic-first UI supporting dark and light modes.

---

## ✨ المميزات | Features

| الميزة | Feature |
|--------|---------|
| 📥 تحميل من أي رابط | Download from any URL |
| 🔄 تحميل متعدد دفعة واحدة | Batch download support |
| 🔍 تحليل تلقائي للرابط | Automatic URL analysis |
| 📜 سجل التحميلات | Download history |
| ⚙️ إعدادات مخصصة | Customizable settings |
| 🌙 وضع داكن/فاتح | Dark/Light mode |
| 📱 تصميم متجاوب | Responsive design |
| 🔒 آمن ومحمي | Secure & safe |

---

## 🛠️ التقنيات | Tech Stack

| Technology | Purpose |
|------------|---------|
| ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white) | Fullstack Framework |
| ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white) | Type-safe Development |
| ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat&logo=tailwindcss&logoColor=white) | Styling |
| ![shadcn/ui](https://img.shields.io/badge/shadcn/ui-000000?style=flat) | UI Components |
| ![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat&logo=prisma&logoColor=white) | Database ORM |
| ![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white) | Deployment |
| ![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=flat&logo=framer&logoColor=white) | Animations |

---

## 🚀 التشغيل | Getting Started

### المتطلبات | Prerequisites

- Node.js 18+ or Bun
- npm, yarn, or bun

### التثبيت | Installation

```bash
# Clone the repository
git clone https://github.com/ziadamr45/Hammel-w-Engez.git
cd Hammel-w-Engez

# Install dependencies
npm install
# or
bun install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

The app will be available at `http://localhost:3000`

---

## 📁 هيكل المشروع | Project Structure

```
Hammel-w-Engez/
├── src/
│   ├── app/              # Next.js pages & API routes
│   ├── components/       # React components
│   │   ├── download/     # Download-specific components
│   │   └── ui/           # Reusable UI components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities & helpers
│   └── store/            # State management
├── prisma/               # Database schema & migrations
├── public/               # Static assets
└── package.json
```

---

## 🤝 المساهمة | Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

---

<div align="center">

Made with ❤️ by [Ziad Amr](https://github.com/ziadamr45)

</div>
