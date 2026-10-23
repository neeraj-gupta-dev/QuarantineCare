import { Router, Request, Response, NextFunction } from 'express';
import Setting from '../models/Setting';
import { getToday } from '../helpers/getToday';
import { seed } from '../scripts/seed';

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
 * Re-seed the database to its initial demo state.
 */
router.post('/reset', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    await seed(false);
    res.json({ message: 'Database reset and re-seeded successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
