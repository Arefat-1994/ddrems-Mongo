# DDREMS - Dire Dawa Real Estate Management System

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/Frontend-React%2019-61dafb.svg)
![Node](https://img.shields.io/badge/Backend-Node.js-339933.svg)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-47a248.svg)

## 🏢 Overview
DDREMS is a comprehensive digital platform designed to modernize the real estate market in Dire Dawa. It provides a secure and transparent environment for property owners, brokers, and customers to interact, execute agreements, and manage payments.

## 🚀 Key Features
*   **Multi-Role Dashboards**: Custom interfaces for Owners, Brokers, Customers, and System/Property Administrators.
*   **Digital Agreements**: Full lifecycle management of rental and sale agreements with digital signatures and PDF generation.
*   **Financial Integration**: Seamless M-Pesa and Chapa payment integration with automated rental schedules and commission tracking.
*   **Property Verification**: Rigorous verification workflow including site checks and property admin approval.
*   **Real-time Communication**: Integrated chat and notification system using Socket.io.
*   **Advanced Analytics**: Data-driven insights and reporting for all stakeholders.

## 🛠 Tech Stack
*   **Frontend**: React, Chart.js, Leaflet, Three.js, jsPDF.
*   **Backend**: Node.js, Express, Socket.io, Mongoose.
*   **Data Storage**: MongoDB, Redis, PostgreSQL (Reporting).
*   **Cloud Services**: Cloudinary (Media), Nodemailer (Email).

## 📂 Project Structure
```text
├── client/                 # React frontend application
├── server/                 # Express backend application
│   ├── models/            # Mongoose schemas
│   ├── routes/            # API endpoints
│   ├── services/          # Business logic & integrations
│   └── middleware/        # Auth & validation middleware
├── ML price/               # Machine Learning price estimation models
└── database/               # Database migration and seed scripts
```

## 🚥 Getting Started

### Prerequisites
*   Node.js (>= 16.0.0)
*   MongoDB
*   Redis (optional for caching)

### Installation
1. Install root dependencies:
   ```bash
   npm install
   ```
2. Install client dependencies:
   ```bash
   npm run install:all
   ```
3. Configure environment variables in `.env`.

### Running the Application
To start both the server and client concurrently:
```bash
npm run dev
```

---
*Built with ❤️ for Dire Dawa Real Estate*
