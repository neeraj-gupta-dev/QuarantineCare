import { Router, Response, NextFunction } from 'express';
import Patient from '../models/Patient';
import TemperatureReading from '../models/TemperatureReading';
import DoctorVisit from '../models/DoctorVisit';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { getToday } from '../helpers/getToday';

const router = Router();

router.use(authenticate);
router.use(authorize('admin', 'doctor'));

/**
 * GET /api/dashboard
 * Accessible by admin and doctor.
 * Returns: occupancy, compliance, pending discharges, mortality stats, weekly trend.
 */
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = await getToday();

    // ─── Counts ──────────────────────────────────────────────────────────
    const [admittedCount, readyCount, dischargedCount, deceasedCount] =
      await Promise.all([
        Patient.countDocuments({ status: 'ADMITTED' }),
        Patient.countDocuments({ status: 'READY_FOR_DISCHARGE' }),
        Patient.countDocuments({ status: 'DISCHARGED_CURED' }),
        Patient.countDocuments({ status: 'DECEASED' }),
      ]);

    const occupancy = admittedCount + readyCount;

    // ─── Today's compliance ──────────────────────────────────────────────
    const activeIds = (
      await Patient.find(
        { status: { $in: ['ADMITTED', 'READY_FOR_DISCHARGE'] } },
        { _id: 1 }
      ).lean()
    ).map((p) => p._id);

    const [tempsDone, visitsDone] = await Promise.all([
      TemperatureReading.distinct('patient', {
        patient: { $in: activeIds },
        dayKey: today,
        isCorrection: false,
      }),
      DoctorVisit.distinct('patient', {
        patient: { $in: activeIds },
        dayKey: today,
      }),
    ]);

    // ─── Mortality & success rates ───────────────────────────────────────
    const totalOutcomes = dischargedCount + deceasedCount;
    const mortalityRate = totalOutcomes > 0 ? deceasedCount / totalOutcomes : 0;
    const successRate = totalOutcomes > 0 ? dischargedCount / totalOutcomes : 0;

    // ─── Mortality over time (by week) ──────────────────────────────────
    const [deceasedPatients, dischargedPatients] = await Promise.all([
      Patient.find(
        { status: 'DECEASED', deceasedAt: { $ne: null } },
        { deceasedAt: 1 }
      ).lean(),
      Patient.find(
        { status: 'DISCHARGED_CURED', dischargedAt: { $ne: null } },
        { dischargedAt: 1 }
      ).lean(),
    ]);

    const weeklyData: Record<string, { deceased: number; discharged: number }> = {};

    for (const p of deceasedPatients) {
      const wk = isoWeekKey(p.deceasedAt!);
      if (!weeklyData[wk]) weeklyData[wk] = { deceased: 0, discharged: 0 };
      weeklyData[wk].deceased++;
    }
    for (const p of dischargedPatients) {
      const wk = isoWeekKey(p.dischargedAt!);
      if (!weeklyData[wk]) weeklyData[wk] = { deceased: 0, discharged: 0 };
      weeklyData[wk].discharged++;
    }

    const mortalityOverTime = Object.entries(weeklyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, d]) => ({
        week,
        deceased: d.deceased,
        discharged: d.discharged,
        total: d.deceased + d.discharged,
        mortalityRate:
          d.deceased + d.discharged > 0
            ? Math.round((d.deceased / (d.deceased + d.discharged)) * 1000) / 10
            : 0,
      }));

    res.json({
      today,
      occupancy: {
        total: 74,
        occupied: occupancy,
        available: 74 - occupancy,
      },
      compliance: {
        totalActive: activeIds.length,
        tempsDone: tempsDone.length,
        tempsPending: activeIds.length - tempsDone.length,
        visitsDone: visitsDone.length,
        visitsPending: activeIds.length - visitsDone.length,
      },
      pendingDischarges: readyCount,
      outcomes: {
        discharged: dischargedCount,
        deceased: deceasedCount,
        total: totalOutcomes,
        mortalityRate: Math.round(mortalityRate * 1000) / 10,
        successRate: Math.round(successRate * 1000) / 10,
      },
      mortalityOverTime,
    });
  } catch (err) {
    next(err);
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns an ISO week key like "2026-W43". */
function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export default router;
