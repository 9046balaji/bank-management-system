import express, { Router, Request, Response } from 'express';
import { query } from '../db/connection';

const router: Router = express.Router();

// ==========================================
// GET ALL CONFIG SETTINGS
// ==========================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM system_config ORDER BY category, config_key');

    // Convert to key-value object with category info
    const config: Record<string, any> = {};
    const categories: Record<string, any[]> = {};
    
    result.rows.forEach((row: any) => {
      config[row.config_key] = row.config_value;
      
      const cat = row.category || 'general';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push({
        key: row.config_key,
        value: row.config_value,
        description: row.description,
        updated_at: row.updated_at,
      });
    });

    res.json({
      success: true,
      data: config,
      categories,
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch config',
    });
  }
});

// ==========================================
// GET CONFIG BY CATEGORY
// ==========================================
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const result = await query(
      'SELECT * FROM system_config WHERE category = $1 ORDER BY config_key',
      [category]
    );

    const config: Record<string, string> = {};
    result.rows.forEach((row: any) => {
      config[row.config_key] = row.config_value;
    });

    res.json({
      success: true,
      data: config,
      rows: result.rows,
    });
  } catch (error) {
    console.error('Error fetching config by category:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch config',
    });
  }
});

// ==========================================
// GET AUDIT LOG
// ==========================================
router.get('/audit-log', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const configKey = req.query.config_key as string;

    let queryText = `
      SELECT * FROM config_audit_log 
      ${configKey ? 'WHERE config_key = $3' : ''}
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const params = configKey ? [limit, offset, configKey] : [limit, offset];

    const result = await query(queryText, params);

    // Get total count
    const countResult = await query(
      `SELECT COUNT(*) FROM config_audit_log ${configKey ? 'WHERE config_key = $1' : ''}`,
      configKey ? [configKey] : []
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch audit log',
    });
  }
});

// ==========================================
// GET CONFIG BY KEY
// ==========================================
router.get('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const result = await query('SELECT * FROM system_config WHERE config_key = $1', [key]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Config key not found',
      });
    }

    res.json({
      success: true,
      data: {
        key: result.rows[0].config_key,
        value: result.rows[0].config_value,
        description: result.rows[0].description,
        updated_at: result.rows[0].updated_at
      },
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch config',
    });
  }
});

// ==========================================
// UPDATE/CREATE CONFIG
// ==========================================
router.put('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { value, description, changed_by, changed_by_name, change_reason } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Value is required',
      });
    }

    // Get old value for audit
    const oldResult = await query('SELECT config_value FROM system_config WHERE config_key = $1', [key]);
    const oldValue = oldResult.rows[0]?.config_value || null;

    // Upsert config
    const result = await query(
      `INSERT INTO system_config (config_key, config_value, description, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (config_key) DO UPDATE SET config_value = $2, description = COALESCE($3, system_config.description), updated_at = NOW()
       RETURNING *`,
      [key, value.toString(), description || null]
    );

    // Log to audit table if value changed
    if (oldValue !== value.toString()) {
      await query(
        `INSERT INTO config_audit_log (config_key, old_value, new_value, changed_by, changed_by_name, change_reason, ip_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [key, oldValue, value.toString(), changed_by || null, changed_by_name || 'ADMIN', change_reason || null, req.ip || null]
      );
    }

    res.json({
      success: true,
      data: {
        key: result.rows[0].config_key,
        value: result.rows[0].config_value,
        description: result.rows[0].description,
        updated_at: result.rows[0].updated_at
      },
      message: 'Config updated successfully',
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update config',
    });
  }
});

// ==========================================
// BATCH UPDATE CONFIG
// ==========================================
router.put('/', async (req: Request, res: Response) => {
  try {
    const { settings, changed_by, changed_by_name, change_reason } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Settings object is required',
      });
    }

    // Update each config key with audit logging
    for (const [key, value] of Object.entries(settings)) {
      // Get old value
      const oldResult = await query('SELECT config_value FROM system_config WHERE config_key = $1', [key]);
      const oldValue = oldResult.rows[0]?.config_value || null;
      
      await query(
        `INSERT INTO system_config (config_key, config_value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (config_key) DO UPDATE SET config_value = $2, updated_at = NOW()`,
        [key, String(value)]
      );

      // Log to audit if value changed
      if (oldValue !== String(value)) {
        await query(
          `INSERT INTO config_audit_log (config_key, old_value, new_value, changed_by, changed_by_name, change_reason, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [key, oldValue, String(value), changed_by || null, changed_by_name || 'ADMIN', change_reason || 'Batch configuration update', req.ip || null]
        );
      }
    }

    // Return updated config
    const result = await query('SELECT * FROM system_config ORDER BY config_key');
    const config: Record<string, string> = {};
    result.rows.forEach((row: any) => {
      config[row.config_key] = row.config_value;
    });

    res.json({
      success: true,
      data: config,
      message: 'Config updated successfully',
    });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update config',
    });
  }
});

// ==========================================
// DELETE CONFIG KEY
// ==========================================
router.delete('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    
    const result = await query('DELETE FROM system_config WHERE config_key = $1 RETURNING *', [key]);

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Config key not found',
      });
    }

    res.json({
      success: true,
      message: 'Config deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting config:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete config',
    });
  }
});

export default router;
