import express, { Router, Request, Response } from 'express';
import { query } from '../db/connection';

const router: Router = express.Router();

// ==========================================
// GET SPENDING BY CATEGORY
// ==========================================
router.get('/spending/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const { start_date, end_date } = req.query;

    let queryText = `
      SELECT 
        COALESCE(tc.name, 'Other') as category,
        COALESCE(tc.icon, 'category') as icon,
        COALESCE(tc.color, '#6B7280') as color,
        COUNT(*) as transaction_count,
        SUM(t.amount) as total_amount,
        ROUND(AVG(t.amount), 2) as avg_amount
      FROM transactions t
      LEFT JOIN transaction_categories tc ON t.category_id = tc.id
      WHERE t.account_id = $1 
      AND t.type IN ('TRANSFER', 'WITHDRAWAL')
      AND t.status = 'COMPLETED'
    `;
    const params: (string | Date)[] = [accountId];

    if (start_date && end_date) {
      params.push(start_date as string, end_date as string);
      queryText += ` AND t.transaction_date BETWEEN $2 AND $3`;
    }

    queryText += ` GROUP BY tc.name, tc.icon, tc.color ORDER BY total_amount DESC`;

    const result = await query(queryText, params);

    // Calculate percentages
    const total = result.rows.reduce((sum: number, row: any) => sum + parseFloat(row.total_amount || 0), 0);
    const dataWithPercentages = result.rows.map((row: any) => ({
      ...row,
      percentage: total > 0 ? Math.round((parseFloat(row.total_amount) / total) * 100) : 0
    }));

    res.json({ 
      success: true, 
      data: dataWithPercentages,
      total_spending: total
    });
  } catch (error) {
    console.error('Error fetching spending data:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch spending data' 
    });
  }
});

// ==========================================
// GET INCOME VS EXPENSE TREND
// ==========================================
router.get('/trend/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const months = parseInt(req.query.months as string) || 6;

    const result = await query(`
      SELECT 
        TO_CHAR(DATE_TRUNC('month', transaction_date), 'Mon') as name,
        DATE_TRUNC('month', transaction_date) as month_date,
        COALESCE(SUM(CASE WHEN type IN ('DEPOSIT', 'LOAN_DISBURSAL') THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type IN ('TRANSFER', 'WITHDRAWAL', 'LOAN_PAYMENT') THEN amount ELSE 0 END), 0) as expense
      FROM transactions
      WHERE account_id = $1
      AND status = 'COMPLETED'
      AND transaction_date >= NOW() - INTERVAL '${months} months'
      GROUP BY DATE_TRUNC('month', transaction_date)
      ORDER BY DATE_TRUNC('month', transaction_date) ASC
    `, [accountId]);

    // Format for Recharts compatibility
    const formattedData = result.rows.map((row: any) => ({
      name: row.name,
      income: parseFloat(row.income),
      expense: parseFloat(row.expense)
    }));

    res.json({ 
      success: true, 
      data: formattedData,
      period: `${months} months`
    });
  } catch (error) {
    console.error('Error fetching trend data:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch trend data' 
    });
  }
});

// ==========================================
// GET MONTHLY SUMMARY
// ==========================================
router.get('/summary/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const { year, month } = req.query;

    let dateFilter = `DATE_TRUNC('month', NOW())`;
    if (year && month) {
      dateFilter = `'${year}-${month}-01'::date`;
    }

    const result = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type IN ('DEPOSIT', 'LOAN_DISBURSAL') THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type IN ('TRANSFER', 'WITHDRAWAL', 'LOAN_PAYMENT') THEN amount ELSE 0 END), 0) as total_expenses,
        COUNT(*) as transaction_count,
        COUNT(DISTINCT DATE(transaction_date)) as active_days
      FROM transactions
      WHERE account_id = $1
      AND status = 'COMPLETED'
      AND DATE_TRUNC('month', transaction_date) = ${dateFilter}
    `, [accountId]);

    const data = result.rows[0];
    const totalIncome = parseFloat(data.total_income);
    const totalExpenses = parseFloat(data.total_expenses);

    res.json({ 
      success: true, 
      data: {
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net: totalIncome - totalExpenses,
        transaction_count: parseInt(data.transaction_count),
        active_days: parseInt(data.active_days),
        savings_rate: totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch summary' 
    });
  }
});

// ==========================================
// GET TOP MERCHANTS/PAYEES
// ==========================================
router.get('/merchants/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const limit = parseInt(req.query.limit as string) || 5;

    const result = await query(`
      SELECT 
        COALESCE(counterparty_name, description) as merchant,
        COUNT(*) as frequency,
        SUM(amount) as total_spent,
        MAX(transaction_date) as last_transaction
      FROM transactions
      WHERE account_id = $1
      AND type IN ('TRANSFER', 'WITHDRAWAL')
      AND status = 'COMPLETED'
      AND (counterparty_name IS NOT NULL OR description IS NOT NULL)
      GROUP BY COALESCE(counterparty_name, description)
      ORDER BY total_spent DESC
      LIMIT $2
    `, [accountId, limit]);

    res.json({ 
      success: true, 
      data: result.rows.map((row: any) => ({
        merchant: row.merchant,
        frequency: parseInt(row.frequency),
        total_spent: parseFloat(row.total_spent),
        last_transaction: row.last_transaction
      }))
    });
  } catch (error) {
    console.error('Error fetching merchants:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch merchants' 
    });
  }
});

// ==========================================
// GET BALANCE OVER TIME
// ==========================================
router.get('/balance-history/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const days = parseInt(req.query.days as string) || 30;

    // Get current balance
    const accountResult = await query('SELECT balance FROM accounts WHERE id = $1', [accountId]);
    if (accountResult.rowCount === 0) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }

    let currentBalance = parseFloat(accountResult.rows[0].balance);

    // Get transactions in reverse chronological order to calculate historical balances
    const txResult = await query(`
      SELECT 
        DATE(transaction_date) as date,
        SUM(CASE 
          WHEN type IN ('DEPOSIT', 'LOAN_DISBURSAL') THEN amount 
          ELSE -amount 
        END) as net_change
      FROM transactions
      WHERE account_id = $1
      AND status = 'COMPLETED'
      AND transaction_date >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(transaction_date)
      ORDER BY DATE(transaction_date) DESC
    `, [accountId]);

    // Calculate balance for each day going backwards
    const balanceHistory: Array<{date: string, balance: number}> = [];
    let runningBalance = currentBalance;

    // Generate all dates in range
    const dates: string[] = [];
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split('T')[0]);
    }

    const txByDate = new Map(txResult.rows.map((row: any) => [row.date.toISOString().split('T')[0], parseFloat(row.net_change)]));

    for (const date of dates) {
      balanceHistory.push({ date, balance: runningBalance });
      const netChange = txByDate.get(date) || 0;
      runningBalance -= netChange; // Subtract to go backwards
    }

    res.json({ 
      success: true, 
      data: balanceHistory.reverse() // Return in chronological order
    });
  } catch (error) {
    console.error('Error fetching balance history:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch balance history' 
    });
  }
});

// ==========================================
// GET TRANSACTION STATISTICS
// ==========================================
router.get('/stats/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;

    const result = await query(`
      SELECT 
        COUNT(*) as total_transactions,
        COUNT(*) FILTER (WHERE type = 'DEPOSIT') as deposits_count,
        COUNT(*) FILTER (WHERE type = 'WITHDRAWAL') as withdrawals_count,
        COUNT(*) FILTER (WHERE type = 'TRANSFER') as transfers_count,
        COALESCE(SUM(amount) FILTER (WHERE type = 'DEPOSIT'), 0) as total_deposits,
        COALESCE(SUM(amount) FILTER (WHERE type IN ('WITHDRAWAL', 'TRANSFER')), 0) as total_withdrawals,
        COALESCE(MAX(amount) FILTER (WHERE type = 'DEPOSIT'), 0) as largest_deposit,
        COALESCE(MAX(amount) FILTER (WHERE type IN ('WITHDRAWAL', 'TRANSFER')), 0) as largest_withdrawal,
        COALESCE(AVG(amount), 0) as avg_transaction
      FROM transactions
      WHERE account_id = $1
      AND status = 'COMPLETED'
    `, [accountId]);

    res.json({ 
      success: true, 
      data: {
        total_transactions: parseInt(result.rows[0].total_transactions),
        deposits: {
          count: parseInt(result.rows[0].deposits_count),
          total: parseFloat(result.rows[0].total_deposits),
          largest: parseFloat(result.rows[0].largest_deposit)
        },
        withdrawals: {
          count: parseInt(result.rows[0].withdrawals_count),
          total: parseFloat(result.rows[0].total_withdrawals),
          largest: parseFloat(result.rows[0].largest_withdrawal)
        },
        transfers_count: parseInt(result.rows[0].transfers_count),
        avg_transaction: parseFloat(result.rows[0].avg_transaction)
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch statistics' 
    });
  }
});

// ==========================================
// COMPARE CURRENT VS PREVIOUS PERIOD
// ==========================================
router.get('/compare/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;

    const result = await query(`
      WITH current_month AS (
        SELECT 
          COALESCE(SUM(CASE WHEN type IN ('DEPOSIT', 'LOAN_DISBURSAL') THEN amount ELSE 0 END), 0) as income,
          COALESCE(SUM(CASE WHEN type IN ('TRANSFER', 'WITHDRAWAL', 'LOAN_PAYMENT') THEN amount ELSE 0 END), 0) as expense
        FROM transactions
        WHERE account_id = $1
        AND status = 'COMPLETED'
        AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', NOW())
      ),
      previous_month AS (
        SELECT 
          COALESCE(SUM(CASE WHEN type IN ('DEPOSIT', 'LOAN_DISBURSAL') THEN amount ELSE 0 END), 0) as income,
          COALESCE(SUM(CASE WHEN type IN ('TRANSFER', 'WITHDRAWAL', 'LOAN_PAYMENT') THEN amount ELSE 0 END), 0) as expense
        FROM transactions
        WHERE account_id = $1
        AND status = 'COMPLETED'
        AND DATE_TRUNC('month', transaction_date) = DATE_TRUNC('month', NOW() - INTERVAL '1 month')
      )
      SELECT 
        c.income as current_income,
        c.expense as current_expense,
        p.income as previous_income,
        p.expense as previous_expense
      FROM current_month c, previous_month p
    `, [accountId]);

    const data = result.rows[0];
    const currentIncome = parseFloat(data.current_income);
    const previousIncome = parseFloat(data.previous_income);
    const currentExpense = parseFloat(data.current_expense);
    const previousExpense = parseFloat(data.previous_expense);

    res.json({ 
      success: true, 
      data: {
        current_month: {
          income: currentIncome,
          expense: currentExpense,
          net: currentIncome - currentExpense
        },
        previous_month: {
          income: previousIncome,
          expense: previousExpense,
          net: previousIncome - previousExpense
        },
        changes: {
          income_change: previousIncome > 0 ? Math.round(((currentIncome - previousIncome) / previousIncome) * 100) : 0,
          expense_change: previousExpense > 0 ? Math.round(((currentExpense - previousExpense) / previousExpense) * 100) : 0,
          net_change: (currentIncome - currentExpense) - (previousIncome - previousExpense)
        }
      }
    });
  } catch (error) {
    console.error('Error comparing periods:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to compare periods' 
    });
  }
});

// ==========================================
// ADMIN: GET SYSTEM-WIDE STATISTICS
// ==========================================
router.get('/admin/stats', async (req: Request, res: Response) => {
  try {
    // Get total users
    const usersResult = await query('SELECT COUNT(*) as count FROM users');
    const totalUsers = parseInt(usersResult.rows[0].count);

    // Get total deposits (sum of all account balances)
    const depositsResult = await query('SELECT COALESCE(SUM(balance), 0) as total FROM accounts');
    const totalDeposits = parseFloat(depositsResult.rows[0].total);

    // Get active loans count
    const loansResult = await query("SELECT COUNT(*) as count FROM loans WHERE status = 'ACTIVE'");
    const activeLoans = parseInt(loansResult.rows[0].count);

    // Get pending loan applications
    const pendingResult = await query("SELECT COUNT(*) as count FROM loan_applications WHERE status = 'PENDING'");
    const pendingApprovals = parseInt(pendingResult.rows[0].count);

    // Get growth percentages (compare to last month)
    const userGrowthResult = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW())) as this_month,
        COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '1 month') 
                         AND created_at < DATE_TRUNC('month', NOW())) as last_month
      FROM users
    `);
    const thisMonthUsers = parseInt(userGrowthResult.rows[0].this_month) || 0;
    const lastMonthUsers = parseInt(userGrowthResult.rows[0].last_month) || 1;
    const userGrowth = Math.round(((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100);

    res.json({
      success: true,
      data: {
        total_users: totalUsers,
        total_deposits: totalDeposits,
        active_loans: activeLoans,
        pending_approvals: pendingApprovals,
        user_growth: userGrowth > 0 ? `+${userGrowth}%` : `${userGrowth}%`,
        deposit_growth: '+12%', // Placeholder - would need historical data
        loan_growth: '+2%' // Placeholder
      }
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch admin statistics'
    });
  }
});

// ==========================================
// ADMIN: GET DEPOSIT TRENDS (DAILY/WEEKLY)
// ==========================================
router.get('/admin/deposit-trends', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    const result = await query(`
      SELECT 
        TO_CHAR(DATE(t.transaction_date), 'Dy') as day,
        DATE(t.transaction_date) as date,
        COALESCE(SUM(t.amount), 0) as total
      FROM transactions t
      WHERE t.type = 'DEPOSIT'
      AND t.status = 'COMPLETED'
      AND t.transaction_date >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(t.transaction_date)
      ORDER BY DATE(t.transaction_date) ASC
    `);

    res.json({
      success: true,
      data: result.rows.map((row: any) => ({
        day: row.day,
        date: row.date,
        total: parseFloat(row.total)
      }))
    });
  } catch (error) {
    console.error('Error fetching deposit trends:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch deposit trends'
    });
  }
});

// ==========================================
// ADMIN: GET RECENT SYSTEM ACTIVITY
// ==========================================
router.get('/admin/activity', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    // Get mix of recent activities
    const result = await query(`
      (
        SELECT 
          'deposit' as type,
          t.transaction_date as time,
          'Large Deposit' as label,
          CONCAT('Account #', SUBSTRING(a.account_number, -4), ' - $', t.amount::text) as description
        FROM transactions t
        JOIN accounts a ON t.account_id = a.id
        WHERE t.type = 'DEPOSIT' AND t.amount >= 10000
        ORDER BY t.transaction_date DESC
        LIMIT 3
      )
      UNION ALL
      (
        SELECT 
          'loan' as type,
          la.applied_at as time,
          'New Loan Application' as label,
          CONCAT('$', la.requested_amount::text, ' requested') as description
        FROM loan_applications la
        WHERE la.status = 'PENDING'
        ORDER BY la.applied_at DESC
        LIMIT 3
      )
      UNION ALL
      (
        SELECT 
          'user' as type,
          u.created_at as time,
          'New User Registration' as label,
          CONCAT(u.full_name, ' joined') as description
        FROM users u
        ORDER BY u.created_at DESC
        LIMIT 4
      )
      ORDER BY time DESC
      LIMIT $1
    `, [limit]);

    const activities = result.rows.map((row: any) => {
      const timeAgo = getTimeAgo(new Date(row.time));
      return {
        type: row.type,
        time: timeAgo,
        label: row.label,
        description: row.description
      };
    });

    res.json({
      success: true,
      data: activities
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch activity'
    });
  }
});

// Helper function for time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

export default router;
