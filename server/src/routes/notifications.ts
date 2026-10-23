import { Router, Response, NextFunction } from 'express';
import Notification from '../models/Notification';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

/**
 * GET /api/notifications
 * Returns notifications for the authenticated user's role, most recent first.
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const notifications = await Notification.find({ toRole: req.user!.role })
      .populate('patient', 'name bedNumber status')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const unreadCount = await Notification.countDocuments({
      toRole: req.user!.role,
      read: false,
    });

    res.json({ unreadCount, notifications });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notifications
 * Body: { ids?: string[] }
 * If ids provided, mark those as read. Otherwise mark ALL unread as read.
 */
router.patch('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { ids } = req.body;

    if (ids && Array.isArray(ids) && ids.length > 0) {
      await Notification.updateMany(
        { _id: { $in: ids }, toRole: req.user!.role },
        { $set: { read: true } }
      );
    } else {
      await Notification.updateMany(
        { toRole: req.user!.role, read: false },
        { $set: { read: true } }
      );
    }

    res.json({ message: 'Notifications marked as read' });
  } catch (err) {
    next(err);
  }
});

export default router;
