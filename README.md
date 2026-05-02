# 🚀 ShramFlow – Advanced Labour Management System

## 🔥 Project Overview
ShramFlow is an innovative, high-performance platform designed to revolutionize workforce management, work distribution, and financial tracking for large-scale labor operations. Built with a focus on **speed, accuracy, and enterprise-grade security**.

[**Live Demo**](https://shram-flow-labour-management-system.vercel.app/)

## 🚨 Problem Statement
Traditional labor and workforce management faces several core challenges:
❌ **Unfair compensation tracking** – Labourers often face discrepancies in calculated piece-rate work or hourly payments.
❌ **Fraudulent data entry** – Middlemen and supervisors struggle to maintain fraud-proof data entries.
❌ **Delayed validation** – Over-reporting limits and payment thresholds are easily breached.
❌ **Slow application response** – Poorly optimized administrative dashboards cause slow user adoption and endless loading screens.

## ✅ Our Solution
ShramFlow ensures absolute trust, transparency, and high performance through zero-wait optimistic UI, robust multi-tenant security, and an automated ledger calculator.

## ⚡ Key Features & Benefits
✅ **Zero-Wait Entry (Optimistic Loading)** – Instant dashboard access with silent background synchronization.
✅ **Row-Level Security (RLS)** – Database-level isolation ensures absolute organizational privacy.
✅ **Real-Time Financial Ledger** – Automated calculation processing work meters vs. dynamic rates.
✅ **Labour Distribution Engine** – Intelligently handles complex group-based area splitting.
✅ **Smart Meter Validation** – Logically prevents data entry errors and over-reporting.
✅ **Bilingual Support** – Native English and Hindi interface for maximum accessibility.

## 🎯 Why ShramFlow?
ShramFlow creates a transparent ecosystem where administrators maintain full control, supervisors track accurate meters, and labourers receive fair, error-free automated payouts – revolutionizing workforce management with scalable Cloud architecture! 🚀

---

## 🛠️ Technical Information

### 💡 Prerequisites
Before running the project locally, make sure you have:
1. [Node.js](https://nodejs.org/) (v18 or higher) installed.
2. A [Supabase](https://supabase.com/) Account & Project setup.

### 📂 Project Structure
The project is structured as a professional full-stack application with clean separation between the frontend and backend:

```text
📂 ShramFlow
 ├── 📂 client/           # Frontend (React + Vite)
 │    └── 📂 src/
 │         ├── 📂 components/  # Well-structured UI components
 │         └── ...
 ├── 📂 server/           # Backend (Node.js + Express)
 │    ├── 📂 src/         # API logic (routes, controllers, services)
 │    ├── 📂 database/    # SQL schemas
 │    └── 📂 supabase/    # Supabase config and edge functions
 └── 📝 package.json      # Root orchestration (Run both with 1 command)
```

---

## 🚀 Getting Started

### 1. Installation
Install dependencies for the entire project (root, client, and server) from the root directory:

```bash
npm run install-all
```

### 2. Configuration
- Backend: Create `server/.env` with your `GEMINI_API_KEY` and Supabase credentials.
- Frontend: Create `client/.env` with your Supabase URL and Anon Key.

### 3. Running the App
You can start both the frontend and backend simultaneously using the root command:

```bash
npm run dev
```

---

## 🎨 Frontend Setup (React + Vite)
Located in the `client/` directory.

### 📦 Key Dependencies
- React 18 & Vite
- Tailwind CSS & shadcn/ui
- TanStack Query
- Supabase JS Client

---

## 🔙 Backend Setup (Node.js + Express)
Located in the `server/` directory. Logic is housed in `server/src/`.

---

## 🌐 Platform Overview
ShramFlow consists of a unified Admin portal and tailored user experiences depending on Access Role (Supervisor vs. Administrator):

## 🏆 Features
- **Admin Audit Logging** – Complete traceability with shadow-logging of all critical actions (approvals, edits, payments).
- **Payment Calculation** – Automated payout estimation based on validated work areas and dynamic user rates.
- **Fraud Prevention** – Intelligent trust scoring and pattern detection.
- **Authentication Resilience** – Layered identity strategy preventing "login hangs."
- **Zero-Crash Server Backend** – Node.js heartbeat monitoring and CommonJS strictness.

*(Note: Add screenshot references here once repository is populated with application images)*
- `Auth System - Secure Login`
- `Supervisor Dashboard - Group Work Distribution`
- `Smart Validation Error Modals`
- `Admin Ledger - Realtime Tracking`

---

## 🔮 Future Plans
🚀 Upcoming Enhancements:
- **Biometric Integration** – Physical logging using native Android APIs.
- **AI-Driven Trust Scoring** – Machine Learning fraud detection models.
- **Offline Progressive Web App (PWA)** – To allow meter-logging in remote, low-connectivity zones.

## ❤️ Contributing
Contributions make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**. Feel free to fork, submit issues, or open a PR!

## 📜 License
This project is licensed under the MIT License. See the `LICENSE` file for more details.

## 📞 Contact
For any queries or collaboration, please open an issue in the main repository.

🌟 Join us in empowering the digital labor force! 🌟
