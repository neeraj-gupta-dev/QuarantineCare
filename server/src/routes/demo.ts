import { Router, Request, Response, NextFunction } from 'express';
import { exec } from 'child_process';
import path from 'path';
import Setting from '../models/Setting';
import { getToday } from '../helpers/getToday';

const router = Router();

/**
 * POST /api/demo/next-day
 * Increment the dayOffset setting by 1 to simulate the passage of a day.
 */
router.post('/next-day', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const setting = await Setting.findOneAndUpdate(
      { key: 'dayOffset' },
      { $inc: { value: 1 } },
      { new: true, upsert: true }
    );

    const today = await getToday();

    res.json({
      message: 'Advanced to next day',
      dayOffset: setting.value,
      today,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/demo/reset
 * Re-run the seed script to reset the database to its initial demo state.
 */
router.post('/reset', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const serverRoot = path.resolve(__dirname, '../..');

    await new Promise<string>((resolve, reject) => {
      exec(
        'npx tsx src/scripts/seed.ts',
        { cwd: serverRoot, timeout: 60000 },
        (error, stdout, stderr) => {
          if (error) return reject(error);
          resolve(stdout);
        }
      );
    });

    res.json({ message: 'Database reset and re-seeded successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
