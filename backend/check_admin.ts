import { query } from './src/db/connection';
import { closePool } from './src/db/connection';

async function checkAdmin() {
    try {
        const result = await query('SELECT id, email, role FROM users WHERE email = $1', ['admin@aurabank.com']);
        console.log('ADMIN_CHECK_RESULT:', JSON.stringify(result.rows));
    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await closePool();
    }
}

checkAdmin();
