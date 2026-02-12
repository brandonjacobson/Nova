## Backend

 # API Endpoints
 /routes/auth -> authRouter 
 /routes/invoices -> invoiceRouter
 /routes/dashboard -> dahboardRouter 
 /routes/public -> publicRouter
 /routes/settings -> settingsRouter

 # Routers (backend/src/routes)
 auth.js -> POST login; GET current authenticated user; PUT update user profile; POST register new business and owner
 invoices.js -> POST create invoice; GET list invoices; GET invoice detailes; POST check payment
 dashboard.js -> GET dasboard stats; GET recent activity; GET cashout history and stats;
 public.js -> GET invoice for payment page; GET QR code invoice payment; GET QR code as base64 data URL; POST check payment status; GET pipeline status; GET current exchange rate
 settings.js -> GET payout addresses; PUT update payout addresses; NESSIE TO DELETE; GET default invoice settings; PUT update default invoice settings; MORE NESSIE

## Frontend
 
 # Frontend Routes
 - / → app/page.js
 - /dashboard → app/dashboard/page.js
 - /invoices → app/invoices/page.js
 - /invoices/new → app/invoices/new/page.js
 - /invoices/[id] → app/invoices/[id]/page.js
 - /login → app/login/page.js
 - /register → app/register/page.js
 - /profile → app/profile/page.js
 - /settings → app/settings/page.js
 - /pay[id] → app/pay/page.js (public payment page fill in exact path)

 # API Calls
  /dashboard
  - api.dashboard.stats()
  - api.dashboard.recent(5)
  - api.dashboard.cashouts(5)
  /invoices
  - api.invoices.list(params)
  /pay
  - api.public.getInvoice(invoiceId)
  - api.public.getPipelineStatus(invoiceId)
  - api.public.checkPayment(invoiceId)
  