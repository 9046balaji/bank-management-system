import { query, closePool } from './src/db/connection';

async function testFeedbackApi() {
    try {
        // 1. Login
        console.log('Logging in...');
        const loginRes = await fetch('http://localhost:5000/api/users/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@aurabank.com', password: 'admin123' })
        });

        if (!loginRes.ok) {
            throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
        }

        const loginData = await loginRes.json();
        const token = loginData.data.token;
        console.log('Login successful. Token obtained.');

        // 2. Fetch Feedback
        console.log('Fetching feedback...');
        const feedbackRes = await fetch('http://localhost:5000/api/admin/ai/feedback', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!feedbackRes.ok) {
            throw new Error(`Fetch feedback failed: ${feedbackRes.status} ${await feedbackRes.text()}`);
        }

        const feedbackData = await feedbackRes.json();
        const feedbacks = feedbackData.data;
        console.log(`Fetched ${feedbacks.length} feedback items.`);

        if (feedbacks.length === 0) {
            console.log('No feedback to summarize.');
            return;
        }

        // 3. Summarize
        const idsToSummarize = feedbacks.slice(0, 3).map((f: any) => f.id);
        console.log(`Summarizing ${idsToSummarize.length} items...`);

        const summarizeRes = await fetch('http://localhost:5000/api/admin/ai/feedback/summarize', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                feedback_ids: idsToSummarize,
                admin_id: loginData.data.user.id
            })
        });

        if (!summarizeRes.ok) {
            throw new Error(`Summarize failed: ${summarizeRes.status} ${await summarizeRes.text()}`);
        }

        const summarizeData = await summarizeRes.json();
        console.log('Summarize response:', JSON.stringify(summarizeData, null, 2));

        // 4. Verify DB Storage
        console.log('Verifying DB storage...');
        const insightId = summarizeData.data.insight.id;
        const dbResult = await query('SELECT * FROM feedback_insights WHERE id = $1', [insightId]);

        if (dbResult.rowCount === 1) {
            console.log('SUCCESS: Insight found in database!');
            console.log('Insight:', dbResult.rows[0]);
        } else {
            console.error('FAILURE: Insight NOT found in database!');
        }

    } catch (err) {
        console.error('Test failed:', err);
    } finally {
        await closePool();
    }
}

testFeedbackApi();
