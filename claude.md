# Mercury

> B2B crypto invoicing platform - accept Solana payments, settle to bank accounts.

## Quick Reference

| Item | Value |
|------|-------|
| **Project** | Mercury (SwampHacks 2025) |
| **Type** | Full-stack web application |
| **Frontend** | Next.js 16 (App Router) + React 19 + Tailwind CSS 4 |
| **Backend** | Express.js 5 + Node.js 20+ |
| **Database** | MongoDB Atlas (Mongoose ODM) |
| **APIs** | Solana Web3.js, Nessie (Capital One sandbox) |

## Project Structure

```
Mercury-Swamphacks/
├── backend/
│   ├── src/
│   │   ├── config/         # Environment config
│   │   ├── models/         # Mongoose schemas (TODO)
│   │   ├── routes/         # Express route handlers
│   │   ├── services/       # Business logic (TODO)
│   │   ├── middleware/     # Auth, validation (TODO)
│   │   └── index.js        # Express app entry
│   ├── .env                # Environment variables (gitignored)
│   ├── .env.example        # Env template
│   └── package.json
├── frontend/
│   ├── src/
│   │   └── app/            # Next.js App Router pages
│   │       ├── layout.js   # Root layout
│   │       ├── page.js     # Home/Dashboard
│   │       └── globals.css # Tailwind + global styles
│   ├── public/             # Static assets
│   ├── next.config.mjs     # Next.js config
│   └── package.json
├── SPEC.md                 # Detailed product specification
├── claude.md               # This file - AI assistant context
└── README.md               # Project readme
```

## Commands

### Backend (from `/backend`)

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (nodemon, port 4000)
npm start            # Start production server
```

### Frontend (from `/frontend`)

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint check
```

## Environment Variables

### Backend (`backend/.env`)

```bash
PORT=4000
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/mercury
JWT_SECRET=<random-string-for-jwt-signing>
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PRIVATE_KEY=<base58-encoded-keypair>
NESSIE_API_KEY=<capital-one-api-key>
NESSIE_HOLDING_ACCOUNT_ID=<nessie-account-id>
```

### Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
```

## Tech Stack Details

### Frontend

- **Next.js 16** with App Router (`/app` directory)
- **React 19** (client components use `'use client'` directive)
- **Tailwind CSS 4** (configured via `postcss.config.mjs`)
- Path alias: `@/*` maps to `./src/*`

### Backend

- **Express 5** REST API
- **CORS** enabled for cross-origin requests
- **JSON** body parsing enabled
- Routes mounted at `/api/*`

### Database

- **MongoDB Atlas** (cloud-hosted)
- **Mongoose** for ODM (to be added)
- Collections: `businesses`, `users`, `invoices`, `payments`, `settlements`

### External APIs

- **Solana**: Use `@solana/web3.js` for wallet generation, transaction monitoring
- **Nessie**: Capital One sandbox at `http://api.nessieisreal.com`

## Key Features to Implement

1. **Auth**: JWT-based multi-tenant authentication
2. **Dashboard**: Business metrics, recent activity
3. **Invoices**: CRUD, status tracking, PDF generation
4. **Payments**: Solana address generation, QR codes, on-chain verification
5. **Settlement**: Nessie API integration for fiat transfers

## Data Models

See `SPEC.md` for full schemas. Key models:

- **Business**: Multi-tenant organization
- **User**: Auth, belongs to Business
- **Invoice**: Line items, payment address, status
- **Payment**: Solana transaction record
- **Settlement**: Nessie transfer record

## API Routes

| Endpoint | Description |
|----------|-------------|
| `POST /api/auth/register` | Register business + user |
| `POST /api/auth/login` | Login, get JWT |
| `GET /api/invoices` | List invoices |
| `POST /api/invoices` | Create invoice |
| `GET /api/invoices/:id` | Get invoice details |
| `POST /api/invoices/:id/check-payment` | Verify Solana payment |
| `GET /api/dashboard/stats` | Dashboard metrics |

## Coding Conventions

### JavaScript/Node

- ES Modules (`import/export`)
- Async/await for promises
- Descriptive variable names (camelCase)
- Error handling with try/catch

### React/Next.js

- Functional components only
- Client components marked with `'use client'`
- Server components by default (no directive)
- Use `fetch` for API calls (or create a shared API client)

### Styling

- Tailwind CSS utility classes
- Design: Modern fintech aesthetic (Stripe/Mercury Bank style)
- Colors: Indigo primary, gray neutrals, semantic status colors
- Components: Cards with shadows, clean tables, pill badges

### File Naming

- Components: PascalCase (`InvoiceCard.js`)
- Utilities: camelCase (`formatCurrency.js`)
- Pages: lowercase with dashes (Next.js convention)

## Current Status

**Phase**: Early development (skeleton complete)

**Completed**:
- Project structure
- Express server setup
- Next.js frontend setup
- Tailwind CSS configuration
- Basic route structure

**In Progress**:
- Database models
- Auth system
- Frontend pages

**TODO**:
- Mongoose models and MongoDB connection
- JWT authentication middleware
- Dashboard UI
- Invoice CRUD pages
- Solana integration
- Nessie integration
- Payment verification flow

## Important Notes

- **Hackathon project**: 36-hour timeline, prioritize demo-able features
- **Use devnet**: All Solana transactions on devnet, not mainnet
- **Nessie is sandbox**: All bank transactions are simulated
- **Demo data**: Seed fake data for presentation
- **UI priority**: Clean, professional fintech look over feature completeness

## Useful Links

- [Solana Docs](https://docs.solana.com)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Nessie API Docs](http://hackathon.capitalone.com/api-documentation)
- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Mongoose Docs](https://mongoosejs.com/docs/)
