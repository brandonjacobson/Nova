# Mercury - Product Specification

> A platform for businesses to solve the abstraction and professionalization of crypto payments using Solana and Nessie APIs.

---

## Table of Contents

1. [Overview](#overview)
2. [Problem Statement](#problem-statement)
3. [Solution](#solution)
4. [Architecture](#architecture)
5. [Tech Stack](#tech-stack)
6. [Data Models](#data-models)
7. [API Specification](#api-specification)
8. [Feature Specification](#feature-specification)
9. [UI/UX Guidelines](#uiux-guidelines)
10. [Demo Script](#demo-script)

---

## Overview

**Mercury** is a B2B crypto invoicing and payment management platform that enables businesses to accept cryptocurrency payments (via Solana) while seamlessly settling to traditional bank accounts (via Nessie/Capital One sandbox). The platform abstracts blockchain complexity, providing a professional dashboard experience similar to Stripe or traditional payment processors.

### Key Value Propositions

- **Simplicity**: No blockchain knowledge required for business users
- **Professional**: Clean invoicing with PDF generation and email notifications
- **Unified**: Crypto acceptance + fiat settlement in one platform
- **Real-time**: On-chain payment verification with instant status updates

---

## Problem Statement

### Target Users

- **Primary**: Small-to-medium businesses wanting to accept crypto payments
- **Secondary**: Freelancers and contractors invoicing in crypto
- **Tertiary**: Enterprises exploring crypto payment rails

### Current Pain Points

1. **Complexity**: Accepting crypto requires wallet management, blockchain knowledge
2. **Fragmentation**: Separate tools for invoicing, payment tracking, and settlement
3. **Professionalism**: Most crypto payment tools lack business-grade UX
4. **Settlement**: No easy path from crypto receipt to bank account

### Why Now

- Solana's low fees and fast finality make it viable for B2B payments
- Increasing business demand for crypto payment options
- Existing solutions are either too technical or too limited in scope

---

## Solution

### What We're Building

A unified business dashboard that provides:

1. **Invoice Management**: Create, send, and track professional invoices
2. **Crypto Payments**: Accept Solana (SOL) and SPL tokens with auto-generated wallets
3. **Payment Verification**: Real-time on-chain monitoring for payment confirmation
4. **Bank Settlement**: Automatic conversion and settlement to business bank accounts
5. **Analytics**: Dashboard overview of payments, revenue, and trends

### Why It's Better

- Everything in one place - no context switching
- Eliminates requirement of understanding blockchain
- Professional, modern fintech UI (not "crypto bro" aesthetic)
- Built-in settlement flow to traditional banking

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│                         (Next.js 16)                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │  Dashboard  │  │  Invoices   │  │  Payments   │  │  Settings  │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP/REST
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                    │
│                      (Express.js + Node.js)                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐ │
│  │    Auth     │  │  Invoices   │  │  Payments   │  │ Settlement │ │
│  │   Service   │  │   Service   │  │   Service   │  │  Service   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘ │
└───────┬─────────────────┬─────────────────┬─────────────────┬───────┘
        │                 │                 │                 │
        ▼                 ▼                 ▼                 ▼
┌───────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   MongoDB     │  │   Solana    │  │   Nessie    │  │    Email    │
│    Atlas      │  │    RPC      │  │     API     │  │   Service   │
│  (Database)   │  │ (Payments)  │  │  (Banking)  │  │  (Optional) │
└───────────────┘  └─────────────┘  └─────────────┘  └─────────────┘
```

### Data Flow

1. **Invoice Creation**: User creates invoice → Backend generates Solana address → Stores in MongoDB
2. **Payment**: Payer sends SOL to address → Solana blockchain confirms → Backend detects payment
3. **Settlement**: Backend triggers Nessie transfer → Simulates fiat deposit to business bank account
4. **Notification**: Dashboard updates in real-time → Optional email notification sent

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x | React framework with App Router |
| React | 19.x | UI library |
| Tailwind CSS | 4.x | Utility-first styling |
| TypeScript | (optional) | Type safety |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x+ | Runtime |
| Express.js | 5.x | REST API framework |
| MongoDB | 7.x | Database (via Atlas) |
| Mongoose | 8.x | ODM for MongoDB |

### External APIs

| Service | Purpose | Documentation |
|---------|---------|---------------|
| Solana Web3.js | Blockchain interaction, wallet generation | [docs.solana.com](https://docs.solana.com) |
| Nessie (Capital One) | Banking sandbox, settlement simulation | [hackathon.capitalone.com](http://hackathon.capitalone.com/api-documentation) |

### Dev Tools

- **nodemon**: Backend hot reload
- **ESLint**: Code linting
- **Prettier**: Code formatting (recommended)

---

## Data Models

### Business (Multi-tenant)

```javascript
{
  _id: ObjectId,
  name: String,                    // "Acme Corp"
  email: String,                   // Primary contact email
  createdAt: Date,
  updatedAt: Date,

  // Solana Config
  solanaWalletAddress: String,     // Main receiving wallet (optional)

  // Nessie Config
  nessieAccountId: String,         // Capital One sandbox account ID

  // Settings
  defaultCurrency: String,         // "USD"
  invoicePrefix: String,           // "INV-"
  invoiceCounter: Number           // Auto-increment for invoice numbers
}
```

### User

```javascript
{
  _id: ObjectId,
  businessId: ObjectId,            // Reference to Business
  email: String,                   // unique
  passwordHash: String,            // bcrypt hashed
  name: String,
  role: String,                    // "owner" | "admin" | "member"
  createdAt: Date,
  lastLoginAt: Date
}
```

### Invoice

```javascript
{
  _id: ObjectId,
  businessId: ObjectId,            // Reference to Business
  invoiceNumber: String,           // "INV-0001"

  // Client Info
  clientName: String,
  clientEmail: String,
  clientAddress: String,           // Optional

  // Line Items
  items: [{
    description: String,
    quantity: Number,
    unitPrice: Number,             // In USD cents
    amount: Number                 // quantity * unitPrice
  }],

  // Totals
  subtotal: Number,                // In USD cents
  tax: Number,                     // In USD cents
  total: Number,                   // In USD cents

  // Payment Config
  solanaPaymentAddress: String,    // Unique address for this invoice
  solanaAmountLamports: Number,    // Amount in lamports (1 SOL = 1B lamports)
  acceptedTokens: [String],        // ["SOL", "USDC"] - future expansion

  // Status
  status: String,                  // "DRAFT" | "SENT" | "PENDING" | "PAID" | "SETTLED" | "CANCELLED"

  // Dates
  issueDate: Date,
  dueDate: Date,
  paidAt: Date,                    // When payment was confirmed
  settledAt: Date,                 // When fiat settlement completed

  // Metadata
  notes: String,                   // Optional notes to client
  createdAt: Date,
  updatedAt: Date
}
```

### Payment

```javascript
{
  _id: ObjectId,
  invoiceId: ObjectId,             // Reference to Invoice
  businessId: ObjectId,            // Reference to Business

  // Solana Transaction Details
  transactionSignature: String,    // Solana tx signature
  fromAddress: String,             // Payer's wallet
  toAddress: String,               // Invoice payment address
  amountLamports: Number,          // Amount received

  // Verification
  status: String,                  // "PENDING" | "CONFIRMED" | "FAILED"
  confirmations: Number,           // Block confirmations
  confirmedAt: Date,

  // Exchange Rate (at time of payment)
  solUsdRate: Number,              // SOL/USD rate
  usdValue: Number,                // USD equivalent in cents

  createdAt: Date
}
```

### Settlement

```javascript
{
  _id: ObjectId,
  paymentId: ObjectId,             // Reference to Payment
  businessId: ObjectId,            // Reference to Business

  // Nessie Transfer Details
  nessieTransferId: String,        // Nessie API transfer ID
  fromAccountId: String,           // Mercury holding account (simulated)
  toAccountId: String,             // Business bank account
  amountCents: Number,             // USD cents transferred

  // Status
  status: String,                  // "PENDING" | "COMPLETED" | "FAILED"
  completedAt: Date,

  // Fees (future)
  feeCents: Number,                // Platform fee
  netAmountCents: Number,          // Amount after fees

  createdAt: Date
}
```

---

## API Specification

### Base URL

- **Development**: `http://localhost:4000/api`
- **Production**: `https://api.mercury.app/api` (placeholder)

### Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

### Endpoints

#### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new business + owner user |
| POST | `/auth/login` | Login, returns JWT |
| POST | `/auth/logout` | Invalidate token |
| GET | `/auth/me` | Get current user + business |

#### Invoices

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/invoices` | List invoices (paginated) |
| POST | `/invoices` | Create new invoice |
| GET | `/invoices/:id` | Get invoice details |
| PUT | `/invoices/:id` | Update invoice |
| DELETE | `/invoices/:id` | Delete invoice (draft only) |
| POST | `/invoices/:id/send` | Mark as sent, notify client |
| POST | `/invoices/:id/check-payment` | Check Solana for payment |

#### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/payments` | List payments (paginated) |
| GET | `/payments/:id` | Get payment details |
| POST | `/payments/:id/settle` | Trigger Nessie settlement |

#### Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard/stats` | Overview statistics |
| GET | `/dashboard/recent` | Recent activity feed |

#### Public (No Auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/public/invoice/:id` | Public invoice view for payer |
| GET | `/public/invoice/:id/qr` | QR code for payment address |

---

## Feature Specification

### 1. Authentication & Multi-Tenancy

**User Stories:**
- As a business owner, I can register my business and create an account
- As a user, I can login and access my business dashboard
- As an owner, I can invite team members to my business

**Implementation:**
- JWT-based authentication with refresh tokens
- Business isolation via `businessId` on all queries
- Role-based access control (owner, admin, member)

**Screens:**
- `/login` - Login form
- `/register` - Registration form (business + user)
- `/settings/team` - Team management (stretch goal)

---

### 2. Dashboard

**User Stories:**
- As a user, I can see an overview of my business's payment status
- As a user, I can quickly access recent invoices and payments

**Key Metrics:**
- Total revenue (this month / all time)
- Pending payments count and value
- Recent invoices (last 5)
- Recent payments (last 5)
- Payment status breakdown (pie/donut chart)

**Screen:** `/dashboard`

**API:** `GET /dashboard/stats`, `GET /dashboard/recent`

---

### 3. Invoice Management

**User Stories:**
- As a user, I can create a new invoice with line items
- As a user, I can view all my invoices with filtering
- As a user, I can send an invoice to a client
- As a user, I can view invoice details and payment status

**Invoice Creation Flow:**
1. Enter client details (name, email)
2. Add line items (description, quantity, price)
3. Set due date and notes
4. Preview invoice
5. Save as draft or send immediately

**Invoice Statuses:**
- `DRAFT` - Not yet sent, editable
- `SENT` - Sent to client, awaiting payment
- `PENDING` - Payment detected, awaiting confirmation
- `PAID` - Payment confirmed on-chain
- `SETTLED` - Fiat settlement completed
- `CANCELLED` - Cancelled by user

**Screens:**
- `/invoices` - Invoice list with filters
- `/invoices/new` - Create invoice form
- `/invoices/:id` - Invoice detail view
- `/invoices/:id/edit` - Edit invoice (draft only)

---

### 4. Solana Payment Flow

**User Stories:**
- As a payer, I can view an invoice and see payment instructions
- As a payer, I can scan a QR code to pay with my Solana wallet
- As a business, I can see when a payment is confirmed

**Technical Flow:**
1. **Address Generation**: When invoice is created/sent, generate a unique Solana keypair
2. **QR Code**: Generate QR with Solana Pay URL format
3. **Monitoring**: Poll Solana RPC for incoming transactions to the address
4. **Confirmation**: After sufficient confirmations, mark invoice as PAID

**Solana Pay URL Format:**
```
solana:<address>?amount=<amount>&label=<business>&message=<invoice_number>
```

**Public Payment Page:** `/pay/:invoiceId`
- Shows invoice summary
- Displays payment address and QR code
- Shows real-time payment status

---

### 5. Nessie Bank Settlement

**User Stories:**
- As a business, I can have confirmed payments automatically settled to my bank
- As a business, I can view settlement history

**Technical Flow:**
1. Payment confirmed on Solana
2. Calculate USD value (use hardcoded rate for demo: 1 SOL = $150)
3. Create Nessie transfer from Mercury holding account to business account
4. Update settlement status

**Nessie API Calls:**
- `POST /accounts/{account_id}/transfers` - Create transfer
- `GET /transfers/{transfer_id}` - Check transfer status

**Note:** Nessie is a sandbox - all transactions are simulated.

---

### 6. Settings

**User Stories:**
- As a business owner, I can update business details
- As a business owner, I can connect my bank account (Nessie)
- As a user, I can update my profile

**Screens:**
- `/settings` - General settings
- `/settings/bank` - Bank account connection
- `/settings/profile` - User profile

---

## UI/UX Guidelines

### Design Philosophy

**Modern Fintech Aesthetic** - Clean, professional, trustworthy. Inspired by:
- Stripe Dashboard
- Mercury Bank
- Linear

### Color Palette

```css
/* Primary */
--primary-500: #6366f1;     /* Indigo - primary actions */
--primary-600: #4f46e5;     /* Indigo darker - hover states */

/* Neutrals */
--gray-50: #f9fafb;         /* Background */
--gray-100: #f3f4f6;        /* Card backgrounds */
--gray-200: #e5e7eb;        /* Borders */
--gray-500: #6b7280;        /* Secondary text */
--gray-900: #111827;        /* Primary text */

/* Status Colors */
--success: #10b981;         /* Green - paid, confirmed */
--warning: #f59e0b;         /* Amber - pending */
--error: #ef4444;           /* Red - failed, overdue */
--info: #3b82f6;            /* Blue - informational */
```

### Typography

- **Font Family**: Inter or system fonts
- **Headings**: Semi-bold (600)
- **Body**: Regular (400)
- **Monospace**: For addresses, amounts (JetBrains Mono or system mono)

### Component Patterns

1. **Cards**: White background, subtle shadow, rounded corners (8px)
2. **Tables**: Clean, minimal borders, hover states
3. **Buttons**: Primary (filled), Secondary (outlined), Ghost (text only)
4. **Forms**: Label above input, clear validation states
5. **Status Badges**: Colored pills with icons

### Layout

- **Sidebar Navigation**: Fixed left sidebar (collapsed on mobile)
- **Content Area**: Max-width container, responsive padding
- **Cards Grid**: 1-3 columns depending on screen size

### Responsive Breakpoints

```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
```

---

## Demo Script

### Setup (Before Demo)

1. Seed database with sample business "Acme Web Services"
2. Create 5-10 sample invoices in various states
3. Create sample payments and settlements
4. Have Phantom wallet ready with devnet SOL

### Demo Flow (5 minutes)

**1. Introduction (30s)**
> "Mercury is a platform that lets businesses accept crypto payments as easily as traditional payments. Let me show you how it works."

**2. Dashboard Overview (45s)**
- Show dashboard with key metrics
- Point out revenue stats, pending payments
- "At a glance, I can see my business's payment health"

**3. Create Invoice (1m)**
- Click "New Invoice"
- Enter client details: "John Doe, john@example.com"
- Add line item: "Website Development - $500"
- Add line item: "Hosting Setup - $100"
- Set due date
- Click "Send Invoice"
- "The invoice is created and a unique Solana address is generated"

**4. Payment Flow (1.5m)**
- Open public invoice link (simulate client view)
- Show QR code and payment address
- "The client sees a clean payment page with a QR code"
- Open Phantom wallet
- Scan QR / paste address
- Send payment (devnet SOL)
- Wait for confirmation
- "Within seconds, the payment is confirmed on the Solana blockchain"

**5. Settlement (45s)**
- Show invoice now marked as "PAID"
- Click "Settle to Bank"
- Show Nessie transfer initiated
- "The crypto is automatically converted and settled to the business bank account"

**6. Closing (30s)**
> "Mercury removes the complexity of crypto for businesses - professional invoicing, instant payments, and seamless settlement. No blockchain knowledge required."

### Backup Plan

- Pre-record video of happy path
- Have screenshots ready
- If Solana devnet is slow, use pre-confirmed transactions

---

## Appendix

### Environment Variables

```bash
# Backend
PORT=4000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-key
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=base58-encoded-key
NESSIE_API_KEY=your-nessie-key
NESSIE_HOLDING_ACCOUNT_ID=mercury-holding-account

# Frontend
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

### Nessie API Notes

- Base URL: `http://api.nessieisreal.com`
- All requests need `?key=<api_key>` query param
- Sandbox only - no real money
- Create accounts at [hackathon.capitalone.com](http://hackathon.capitalone.com)

### Solana Notes

- Use Devnet for development/demo
- Mainnet for production (future)
- 1 SOL = 1,000,000,000 lamports
- Typical finality: ~400ms

---

*Last updated: January 2025*
*Version: 1.0.0*
