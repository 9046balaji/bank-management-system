import express, { Router, Request, Response } from 'express';
import { query } from '../db/connection';

const router: Router = express.Router();

// ==========================================
// GET ALL CONFIG SETTINGS
// ==========================================
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await query('SELECT * FROM system_config ORDER BY config_key');

    // Convert to key-value object
    const config: Record<string, string> = {};
    result.rows.forEach((row: any) => {
      config[row.config_key] = row.config_value;
    });

    res.json({
      success: true,
      data: config,
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
    const { value, description } = req.body;

    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Value is required',
      });
    }

    // Upsert config
    const result = await query(
      `INSERT INTO system_config (config_key, config_value, description, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (config_key) DO UPDATE SET config_value = $2, description = COALESCE($3, system_config.description), updated_at = NOW()
       RETURNING *`,
      [key, value.toString(), description || null]
    );

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
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Settings object is required',
      });
    }

    // Update each config key
    for (const [key, value] of Object.entries(settings)) {
      await query(
        `INSERT INTO system_config (config_key, config_value, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (config_key) DO UPDATE SET config_value = $2, updated_at = NOW()`,
        [key, String(value)]
      );
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
