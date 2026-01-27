# Aura Bank Backend

A Node.js/Express backend server for the Aura Bank fintech ecosystem with PostgreSQL database integration.

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ installed
- PostgreSQL 12+ installed and running
- npm or yarn package manager

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   - The `.env.local` file is already configured with:
     - Database: `aurabank`
     - User: `postgres`
     - Password: `95889396`
     - Port: `5432`
     - Server: `localhost:5000`

3. **Ensure PostgreSQL is running:**
   ```powershell
   # Windows - Start PostgreSQL Service
   Start-Service postgresql-x64-16
   
   # Or start from Services
   services.msc
   ```

4. **Create and seed the database:**
   ```powershell
   psql -U postgres -d aurabank -f '..\database\schema.sql'
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

   Server will be running on: **http://localhost:5000**

## 📁 Project Structure

```
backend/
├── src/
│   ├── index.ts              # Express server entry point
│   ├── db/
│   │   └── connection.ts      # PostgreSQL connection pool
│   ├── routes/
│   │   ├── users.ts          # User management endpoints
│   │   ├── accounts.ts        # Account endpoints
│   │   ├── transactions.ts    # Transaction endpoints
│   │   └── loans.ts           # Loan endpoints
│   └── middleware/            # Express middleware
├── .env.local                # Environment configuration
├── package.json              # Dependencies
├── tsconfig.json             # TypeScript config
└── README.md                 # This file
```

## 🔌 API Endpoints

### Health Check
- `GET /health` - Server health status
- `GET /api/health/db` - Database connection check

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Accounts
- `GET /api/accounts` - Get all accounts
- `GET /api/accounts/:id` - Get account by ID
- `GET /api/accounts/user/:userId` - Get user's accounts
- `POST /api/accounts` - Create new account
- `PATCH /api/accounts/:id/balance` - Update account balance

### Transactions
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/:id` - Get transaction by ID
- `GET /api/transactions/account/:accountId` - Get account transactions
- `POST /api/transactions` - Create transaction
- `PATCH /api/transactions/:id/status` - Update transaction status

### Loans
- `GET /api/loans` - Get all loans
- `GET /api/loans/:id` - Get loan by ID
- `GET /api/loans/user/:userId` - Get user's loans
- `POST /api/loans` - Create new loan
- `GET /api/loans/applications/all` - Get all loan applications
- `POST /api/loans/applications/create` - Create loan application
- `PATCH /api/loans/:id/status` - Update loan status

## 🛠️ Development

### Scripts
```bash
# Development mode with auto-reload
npm run dev:watch

# Build TypeScript
npm run build

# Start production build
npm start
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| DB_HOST | localhost | PostgreSQL host |
| DB_PORT | 5432 | PostgreSQL port |
| DB_NAME | aurabank | Database name |
| DB_USER | postgres | Database user |
| DB_PASSWORD | 95889396 | Database password |
| SERVER_PORT | 5000 | Server port |
| NODE_ENV | development | Environment |
| JWT_SECRET | (provided) | JWT signing key |
| JWT_EXPIRES_IN | 24h | JWT expiration |
| FRONTEND_URL | http://localhost:3000 | Frontend URL for CORS |

## 📊 Database Schema

The application uses the following main tables:
- **users** - User accounts with KYC status
- **accounts** - Bank accounts with balance
- **transactions** - Financial transactions
- **cards** - Debit/credit cards
- **loans** - Active loans
- **loan_applications** - Pending applications
- **support_tickets** - Customer support tickets
- **system_config** - System configuration

## 🔐 Security Notes

⚠️ **Important for Production:**
- Change `JWT_SECRET` to a strong, unique value
- Use environment-specific `.env` files
- Don't commit `.env.local` to version control
- Use bcryptjs for password hashing
- Implement rate limiting
- Add input validation and sanitization
- Use HTTPS in production
- Implement proper authentication middleware

## 🐛 Troubleshooting

### Database Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** Ensure PostgreSQL is running and `.env.local` has correct credentials

### Port Already in Use
```
Error: listen EADDRINUSE :::5000
```
**Solution:** Change `SERVER_PORT` in `.env.local` or kill process on port 5000

### Module Not Found Errors
```
Cannot find module 'express'
```
**Solution:** Run `npm install` again

## 📝 Example API Requests

### Create User
```bash
POST http://localhost:5000/api/users
Content-Type: application/json

{
  "full_name": "John Doe",
  "email": "john@example.com",
  "password_hash": "hashed_password",
  "phone_number": "+1234567890",
  "address": "123 Main St"
}
```

### Create Account
```bash
POST http://localhost:5000/api/accounts
Content-Type: application/json

{
  "user_id": "uuid-here",
  "account_number": "1234567890",
  "account_type": "SAVINGS",
  "balance": 5000.00
}
```

### Create Transaction
```bash
POST http://localhost:5000/api/transactions
Content-Type: application/json

{
  "account_id": "uuid-here",
  "type": "TRANSFER",
  "amount": 500.00,
  "description": "Payment to vendor",
  "status": "COMPLETED"
}
```

## 🤝 Integration with Frontend

The frontend (React app on port 3000) can connect to this backend:

```typescript
// Example fetch call
const response = await fetch('http://localhost:5000/api/users');
const data = await response.json();
```

## 📚 Additional Resources

- [Express.js Documentation](https://expressjs.com/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Node.js Documentation](https://nodejs.org/docs/)

---

**Backend Version:** 1.0.0  
**Last Updated:** January 2026
