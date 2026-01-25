# Nova — Crypto Invoicing & Payments Dashboard

Nova is a crypto invoicing and payments dashboard designed to help businesses create invoices, track payments, and manage transaction history through a clean, modern interface.

**LIVE:** https://nova-sand-iota.vercel.app/

This project was built as a hackathon submission for **SwampHacks XI**.

---

## Features

- Create and manage crypto invoices
- Track invoice status (e.g., pending, paid)
- Dashboard view for invoices, payments, and transaction history
- Solana Pay QR code generation for crypto payment requests (demo-ready)
- Multi-currency settlement modeling with simulated exchange rates (BTC / ETH / SOL / fiat)

---

## Tech Stack

- **Frontend:** Next.js, React
- **Backend:** Node.js, Express.js
- **Database:** MongoDB (MongoDB Atlas or Local MongoDB)
- **APIs / Integrations:** Solana Pay (QR payment requests), REST API architecture

---

## Project Structure

```
.
├── frontend/              # Next.js frontend
└── backend/               # Node.js + Express backend
```

---

## Getting Started

### Prerequisites

Make sure you have the following installed:
- Node.js (v18+ recommended)
- npm (or yarn/pnpm)
- MongoDB (either Atlas or Local)

---

## Installation

### 1) Clone the Repository

```bash
git clone <YOUR_REPO_URL>
cd <YOUR_REPO_FOLDER>
```

### 2) Install Dependencies

#### Frontend
```bash
cd frontend
npm install
```

#### Backend
```bash
cd ../backend
npm install
```

---

## Environment Variables

### Backend (`backend/.env`)

Create a `.env` file in the `backend/` directory:

```bash
cd backend
touch .env
```

Add:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

### Frontend (`frontend/.env.local`) (optional)

If your frontend expects an API URL environment variable, create:

```bash
cd ../frontend
touch .env.local
```

Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

---

## Running Without MongoDB Atlas (Local MongoDB Fallback)

If you do not have access to the team’s MongoDB Atlas cluster, you can run Nova using **Local MongoDB**.

### 1) Install MongoDB Community Edition
Download and install MongoDB Community Edition for your OS:  
https://www.mongodb.com/try/download/community

### 2) Start MongoDB locally
By default, MongoDB runs on port `27017`.

You can verify it is running using:
```bash
mongosh
```

### 3) Update your backend `.env`
Set the `MONGODB_URI` to a local database:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/nova
PORT=5000
```

The backend will now use your local database instead of Atlas.

---

## Run the Application

### 1) Start the Backend

From the `backend/` directory:

```bash
npm run dev
```

If `dev` is not configured, use:

```bash
npm start
```

Backend will run on:
- `http://localhost:5000`

### 2) Start the Frontend

From the `frontend/` directory:

```bash
npm run dev
```

Frontend will run on:
- `http://localhost:3000`

---

## Third-Party Services and APIs Used

- **MongoDB Atlas** (optional cloud database hosting)
- **MongoDB** (local database fallback supported)
- **Solana Pay** (QR payment request format and transaction request flows)
- **Solana blockchain** (payment flow design and demo transaction support)

---

## Notes

Crypto settlement and exchange rate conversion logic is implemented in a demo-ready format and will be soon extended to production-ready on-chain verification and automated conversion systems.

---

## License

Provided as-is for hackathon and educational purposes.
