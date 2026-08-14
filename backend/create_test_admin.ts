import { query, closePool } from './src/db/connection';
import { hashPassword } from './src/utils/password';

async function createTestAdmin() {
    try {
        const email = 'admin@aurabank.com';
        const password = 'admin123'; // Simple password for testing
        const hashedPassword = await hashPassword(password);

        // 1. Create or Update Admin User
        console.log('Creating/Updating admin user...');
        const userResult = await query(
            `INSERT INTO users (full_name, email, password_hash, role, kyc_status, phone_number)
       VALUES ($1, $2, $3, 'ADMIN', 'VERIFIED', '1234567890')
       ON CONFLICT (email) 
       DO UPDATE SET role = 'ADMIN', password_hash = $3
       RETURNING id, email, role`,
            ['Admin User', email, hashedPassword]
        );
        const adminId = userResult.rows[0].id;
        console.log('Admin user ready:', userResult.rows[0]);

        // 2. Seed Feedback Data
        console.log('Seeding feedback data...');
        // Create a regular user for feedback
        const userEmail = 'user@test.com';
        const userPw = await hashPassword('user123');
        const regularUserResult = await query(
            `INSERT INTO users (full_name, email, password_hash, role, kyc_status)
       VALUES ($1, $2, $3, 'USER', 'VERIFIED')
       ON CONFLICT (email) DO UPDATE SET role = 'USER'
       RETURNING id`,
            ['Test User', userEmail, userPw]
        );
        const userId = regularUserResult.rows[0].id;

        const feedbacks = [
            {
                subject: 'App crashes on login',
                description: 'Every time I try to login with FaceID, the app crashes immediately.',
                type: 'BUG',
                category: 'APP',
                rating: 1,
                status: 'NEW'
            },
            {
                subject: 'Great new features',
                description: 'I really like the new spending analytics. Very helpful!',
                type: 'PRAISE',
                category: 'FEATURE',
                rating: 5,
                status: 'NEW'
            },
            {
                subject: 'Transfer limit too low',
                description: 'I need to transfer more than 50k but the limit blocks me.',
                type: 'COMPLAINT',
                category: 'SERVICE',
                rating: 2,
                status: 'NEW'
            },
            {
                subject: 'Add dark mode',
                description: 'Please add dark mode support for the dashboard.',
                type: 'FEATURE',
                category: 'APP',
                rating: 4,
                status: 'NEW'
            },
            {
                subject: 'Login is slow',
                description: 'It takes 10 seconds to log in.',
                type: 'IMPROVEMENT',
                category: 'APP',
                rating: 3,
                status: 'NEW'
            }
        ];

        for (const f of feedbacks) {
            await query(
                `INSERT INTO feedback (user_id, type, category, subject, description, rating, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                [userId, f.type, f.category, f.subject, f.description, f.rating, f.status]
            );
        }
        console.log(`Seeded ${feedbacks.length} feedback items.`);

    } catch (err) {
        console.error('Script failed:', err);
    } finally {
        await closePool();
    }
}

createTestAdmin();
