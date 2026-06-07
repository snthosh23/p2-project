# Smart Expense Tracker (Fintech-style Web Application)

A modern, full-stack personal finance application. Build a premium dashboard tracking balances, budgets, monthly spending analytics, OCR bills, voice commands, and financial intelligence insights.

## Project Structure

```
smart-expense-tracker/
│
├── frontend/
│   ├── index.html           # Landing Page
│   ├── login.html           # Authentication Login Card
│   ├── register.html        # Authentication Sign Up Card
│   ├── dashboard.html       # Analytics Charts and Balance Counters
│   ├── add-expense.html     # Voice Inputs and OCR Receipts
│   ├── add-income.html      # Income Logging Form
│   ├── reports.html         # Interactive Ledger table, CSV / PDF Exports
│   ├── budgets.html         # Envelopes ceiling progress & 50/30/20 recommendations
│   ├── profile.html         # User settings and Custom accounts configuration
│   ├── settings.html        # Display Theme preferences and Data purging
│   ├── css/
│   │   └── style.css        # Premium Glassmorphism and responsive design
│   └── js/
│       ├── app.js           # Client side layout injection, auth checks, and notification bells
│       ├── auth.js          # Authentication handlers
│       ├── dashboard.js     # ChartJS mount, health scores, and recent transaction feeds
│       ├── transactions.js  # Traditional, OCR, and Web Speech voice inputs
│       ├── budgets.js       # Budget planners and recommendations syncs
│       └── reports.js       # Search filters, CSV/PDF file downloads triggers
│
├── backend/
│   ├── config/
│   │   └── db.js            # MongoDB Mongoose database connection
│   ├── models/
│   │   ├── User.js          # User schema (auth, accounts, settings)
│   │   ├── Transaction.js   # Transactions (type, category, amount)
│   │   ├── Budget.js        # Spending ceilings per month/category
│   │   ├── Report.js        # Cached monthly totals summary
│   │   ├── Notification.js  # Warning triggers logs
│   │   └── Category.js      # Category item names
│   ├── routes/              # Routers (Auth, Transactions, Budgets, Reports, Profile, Notifications)
│   ├── controllers/         # Controller logic implementation
│   ├── middleware/
│   │   └── auth.js          # JWT Verification protection interceptor
│   ├── temp/
│   │   └── uploads/         # Receipt images uploaded target
│   ├── server.js            # Express server initialization, security rules, and seeding
│   ├── .env                 # Environment secrets
│   └── package.json         # Backend node scripts and dependencies
│
├── netlify.toml             # Netlify CDN build configuration
└── README.md                # Documentation guide
```

## Backend Security Configuration

- **JWT Authentication**: Secured session management verifying signatures.
- **bcrypt Password Hashing**: Hashing algorithm utilizing salt rounds preventing database leaks.
- **Helmet**: Secures HTTP headers.
- **CORS**: Allows API accessibility across different clients.
- **Rate Limiter**: Caps requests to prevent Denial of Service.

## Installation and Local Startup

### Prerequisites

- Node.js (v18+)
- MongoDB (Local or MongoDB Atlas cluster connection string)

### Steps

1. **Setup Environment Variables**:
   In `backend/`, copy the sample configuration:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Modify `backend/.env` with your actual MongoDB URI:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://127.0.0.1:27017/smart-expense-tracker
   JWT_SECRET=super_secret_key_123_change_this_in_production
   ```

2. **Install Server Dependencies**:
   Navigate to the backend directory and run:
   ```bash
   cd backend
   npm install
   ```

3. **Run Dev server**:
   ```bash
   npm run dev
   ```
   The backend API will boot on `http://localhost:5000/api`. Standard categories seed automatically upon first database connection.

4. **Launch Frontend Client**:
   Open `frontend/index.html` directly in your browser or run inside a local dev server (e.g. Live Server).
