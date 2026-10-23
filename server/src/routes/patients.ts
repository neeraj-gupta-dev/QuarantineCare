import { Router, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Patient from '../models/Patient';
import TemperatureReading from '../models/TemperatureReading';
import DoctorVisit from '../models/DoctorVisit';
import Notification from '../models/Notification';
import AuditLog from '../models/AuditLog';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { getToday } from '../helpers/getToday';
import { isFever, calcFeverFreeStreak } from '../helpers/businessRules';

const router = Router();

// All patient routes require authentication
router.use(authenticate);

// ─── GET /api/patients ──────────────────────────────────────────────────────
// Query: status, search, todayTemp=pending|done, todayVisit=pending|done
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const today = await getToday();
    const { status, search, todayTemp, todayVisit } = req.query;

    // Build base query
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const patients = await Patient.find(filter)
      .populate('dischargeRecommendedBy', 'name email role')
      .sort({ bedNumber: 1, status: 1 })
      .lean();

    const patientIds = patients.map((p) => p._id);

    // Batch-fetch today's readings and visits + all readings for streaks
    const [todayReadings, todayVisits, allReadings] = await Promise.all([
      TemperatureReading.find({
        patient: { $in: patientIds },
        dayKey: today,
        isCorrection: false,
      }).lean(),
      DoctorVisit.find({
        patient: { $in: patientIds },
        dayKey: today,
      }).lean(),
      TemperatureReading.find({
        patient: { $in: patientIds },
        isCorrection: false,
      })
        .sort({ dayKey: -1 })
        .lean(),
    ]);

    // Build lookup maps
    const todayTempSet = new Set(todayReadings.map((r) => r.patient.toString()));
    const todayVisitSet = new Set(todayVisits.map((v) => v.patient.toString()));

    const readingsByPatient = new Map<string, { dayKey: string; valueF: number }[]>();
    for (const r of allReadings) {
      const pid = r.patient.toString();
      if (!readingsByPatient.has(pid)) readingsByPatient.set(pid, []);
      readingsByPatient.get(pid)!.push({ dayKey: r.dayKey, valueF: r.valueF });
    }

    // Enrich each patient with derived fields
    let enriched = patients.map((p) => {
      const pid = p._id.toString();
      const readings = readingsByPatient.get(pid) || [];
      const lastReading = readings.length > 0 ? readings[0] : null;

      return {
        ...p,
        todayTempDone: todayTempSet.has(pid),
        todayDoctorVisited: todayVisitSet.has(pid),
        lastTemperature: lastReading?.valueF ?? null,
        feverFreeStreak: calcFeverFreeStreak(readings),
        isFeverNow: lastReading ? isFever(lastReading.valueF) : null,
      };
    });

    // Post-filter by today's workflow status
    if (todayTemp === 'done') enriched = enriched.filter((p) => p.todayTempDone);
    if (todayTemp === 'pending') enriched = enriched.filter((p) => !p.todayTempDone);
    if (todayVisit === 'done') enriched = enriched.filter((p) => p.todayDoctorVisited);
    if (todayVisit === 'pending') enriched = enriched.filter((p) => !p.todayDoctorVisited);

    res.json({ today, count: enriched.length, patients: enriched });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/patients/:id ──────────────────────────────────────────────────
// Full detail: readings, visits, audit trail, derived fields
router.get('/:id', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const patient = await Patient.findById(req.params.id)
      .populate('dischargeRecommendedBy', 'name email role')
      .lean();

    if (!patient) {
      res.status(404).json({ code: 'NOT_FOUND', message: 'Patient not found' });
      return;
    }

    const today = await getToday();

    const [readings, visits, auditLogs] = await Promise.all([
      TemperatureReading.find({ patient: patient._id })
        .populate('recordedBy', 'name role')
        .sort({ dayKey: -1, recordedAt: -1 })
        .lean(),
      DoctorVisit.find({ patient: patient._id })
        .populate('doctor', 'name role')
        .sort({ dayKey: -1 })
        .lean(),
      AuditLog.find({ patient: patient._id })
        .populate('actor', 'name role')
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    // Non-correction readings for streak calculation
    const primaryReadings = readings
      .filter((r) => !r.isCorrection)
      .map((r) => ({ dayKey: r.dayKey, valueF: r.valueF }));

    const todayReading = primaryReadings.find((r) => r.dayKey === today);
    const todayVisit = visits.find((v) => v.dayKey === today);
    const lastReading = primaryReadings[0] || null;

    res.json({
      ...patient,
      todayTempDone: !!todayReading,
      todayDoctorVisited: !!todayVisit,
      lastTemperature: lastReading?.valueF ?? null,
      feverFreeStreak: calcFeverFreeStreak(primaryReadings),
      isFeverNow: lastReading ? isFever(lastReading.valueF) : null,
      readings,
      visits,
      auditLogs,
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/patients (admin) ─────────────────────────────────────────────
// Admit a new patient; auto-assign the lowest available bed.
router.post(
  '/',
  authorize('admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { name, age, gender, notes } = req.body;

      if (!name || age === undefined || !gender) {
        res.status(400).json({
          code: 'BAD_REQUEST',
          message: 'name, age, and gender are required',
        });
        return;
      }

      // Find lowest free bed (1–74)
      const occupied = await Patient.find(
        { bedNumber: { $exists: true } },
        { bedNumber: 1 }
      ).lean();
      const occupiedSet = new Set(occupied.map((p) => p.bedNumber));

      let freeBed: number | null = null;
      for (let b = 1; b <= 74; b++) {
        if (!occupiedSet.has(b)) {
          freeBed = b;
          break;
        }
      }

      if (freeBed === null) {
        res
          .status(409)
          .json({ code: 'FACILITY_FULL', message: 'Facility full — all 74 beds are taken' });
        return;
      }

      const patient = await Patient.create({
        name,
        age,
        gender,
        bedNumber: freeBed,
        admittedAt: new Date(),
        status: 'ADMITTED',
        notes: notes || '',
      });

      await AuditLog.create({
        actor: req.user!.userId,
        action: 'ADMIT_PATIENT',
        patient: patient._id,
        details: { bedNumber: freeBed, name, age, gender },
      });

      res.status(201).json(patient);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/patients/:id/temperature (nurse) ─────────────────────────────
router.post(
  '/:id/temperature',
  authorize('nurse'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const patient = await Patient.findById(req.params.id);
      if (!patient) {
        res.status(404).json({ code: 'NOT_FOUND', message: 'Patient not found' });
        return;
      }

      // Rule: Discharged or deceased patients are read-only
      if (['DISCHARGED_CURED', 'DECEASED'].includes(patient.status)) {
        res.status(400).json({
          code: 'READ_ONLY',
          message: `Cannot record temperature for a ${patient.status} patient. Patient record is read-only.`,
        });
        return;
      }

      const { valueF, isCorrection, correctionReason } = req.body;
      if (valueF === undefined || valueF === null || typeof valueF !== 'number' || isNaN(valueF)) {
        res.status(400).json({ code: 'BAD_REQUEST', message: 'Numeric valueF is required' });
        return;
      }

      // Rule: Valid range 90.0 to 110.0°F, otherwise 400
      if (valueF < 90.0 || valueF > 110.0) {
        res.status(400).json({
          code: 'INVALID_RANGE',
          message: 'Temperature must be between 90.0°F and 110.0°F',
        });
        return;
      }

      const today = await getToday();

      // Rule: If one exists, return 409 and show "Already recorded today at HH:MM by <nurse>"
      const existingReading = await TemperatureReading.findOne({
        patient: patient._id,
        dayKey: today,
        isCorrection: false,
      }).populate('recordedBy', 'name');

      if (existingReading && !isCorrection) {
        const nurseName =
          typeof existingReading.recordedBy === 'object' && existingReading.recordedBy
            ? (existingReading.recordedBy as any).name
            : 'Nurse';
        const timeStr = new Date(existingReading.recordedAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        res.status(409).json({
          code: 'DUPLICATE_READING',
          message: `Already recorded today at ${timeStr} by ${nurseName}`,
          existingReading: {
            time: timeStr,
            recordedBy: nurseName,
            valueF: existingReading.valueF,
          },
        });
        return;
      }

      // Rule: Allow "Add correction" with a mandatory reason
      if (isCorrection && (!correctionReason || !correctionReason.trim())) {
        res.status(400).json({
          code: 'MANDATORY_CORRECTION_REASON',
          message: 'A correction reason is mandatory when submitting a temperature correction',
        });
        return;
      }

      // Fetch previous reading to check for unusual change (> 3.0°F)
      const prevReading = await TemperatureReading.findOne({
        patient: patient._id,
        isCorrection: false,
      }).sort({ recordedAt: -1 });

      const warnings: string[] = [];

      // Rule: Warn if the change from previous reading is more than 3°F
      if (prevReading && Math.abs(valueF - prevReading.valueF) > 3.0) {
        warnings.push(
          `Unusual change of ${Math.abs(valueF - prevReading.valueF).toFixed(1)}°F from previous reading (${prevReading.valueF}°F), please re-check`
        );
      }

      // Rule: Warn at >= 104°F: "Critical fever, notify doctor immediately" and send notification to doctors
      if (valueF >= 104.0) {
        warnings.push('Critical fever, notify doctor immediately');
        await Notification.create({
          toRole: 'doctor',
          patient: patient._id,
          type: 'CRITICAL_FEVER',
          message: `CRITICAL FEVER ALERT (≥104°F): ${patient.name} (Bed ${patient.bedNumber}) recorded ${valueF}°F. Notify doctor immediately.`,
        });
      }

      // Rule: If a patient spikes a fever after being recommended, auto-revert to ADMITTED and notify doctor and admin
      let autoReverted = false;
      if (isFever(valueF) && patient.status === 'READY_FOR_DISCHARGE') {
        patient.status = 'ADMITTED';
        patient.dischargeRecommendedBy = null;
        patient.dischargeRecommendedAt = null;
        await patient.save();
        autoReverted = true;

        await Promise.all([
          Notification.create({
            toRole: 'doctor',
            patient: patient._id,
            type: 'DISCHARGE_REVOKED',
            message: `${patient.name} (Bed ${patient.bedNumber}) spiked a fever (${valueF}°F). Discharge recommendation has been auto-reverted to ADMITTED.`,
          }),
          Notification.create({
            toRole: 'admin',
            patient: patient._id,
            type: 'DISCHARGE_REVOKED',
            message: `${patient.name} (Bed ${patient.bedNumber}) spiked a fever (${valueF}°F). Discharge recommendation has been auto-reverted to ADMITTED.`,
          }),
          AuditLog.create({
            actor: req.user!.userId,
            action: 'REVOKE_DISCHARGE_FEVER_SPIKE',
            patient: patient._id,
            details: { valueF, dayKey: today, newStatus: 'ADMITTED' },
          }),
        ]);
      }

      const reading = await TemperatureReading.create({
        patient: patient._id,
        valueF,
        recordedBy: req.user!.userId,
        recordedAt: new Date(),
        dayKey: today,
        isCorrection: isCorrection || false,
        correctionReason: isCorrection ? correctionReason.trim() : null,
      });

      await AuditLog.create({
        actor: req.user!.userId,
        action: isCorrection ? 'RECORD_TEMP_CORRECTION' : 'RECORD_TEMPERATURE',
        patient: patient._id,
        details: {
          valueF,
          dayKey: today,
          isCorrection: !!isCorrection,
          correctionReason,
          autoReverted,
          warnings,
        },
      });

      res.status(201).json({
        ...reading.toObject(),
        warnings: warnings.length > 0 ? warnings : undefined,
        autoReverted,
      });
    } catch (err: any) {
      if (err.code === 11000) {
        res.status(409).json({
          code: 'DUPLICATE_READING',
          message: 'Temperature already recorded for this patient today. Use isCorrection=true for corrections.',
        });
        return;
      }
      next(err);
    }
  }
);

// ─── POST /api/patients/:id/visit (doctor) ──────────────────────────────────
router.post(
  '/:id/visit',
  authorize('doctor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const patient = await Patient.findById(req.params.id);
      if (!patient) {
        res.status(404).json({ code: 'NOT_FOUND', message: 'Patient not found' });
        return;
      }

      // Rule: Discharged or deceased patients are read-only
      if (['DISCHARGED_CURED', 'DECEASED'].includes(patient.status)) {
        res.status(400).json({
          code: 'READ_ONLY',
          message: `Cannot visit a ${patient.status} patient. Patient record is read-only.`,
        });
        return;
      }

      const today = await getToday();

      // Rule: Blocked until today's temperature exists, with message "Waiting for nurse's temperature reading"
      const todayReading = await TemperatureReading.findOne({
        patient: patient._id,
        dayKey: today,
        isCorrection: false,
      });

      if (!todayReading) {
        res.status(400).json({
          code: 'WAITING_FOR_TEMPERATURE',
          message: "Waiting for nurse's temperature reading",
        });
        return;
      }

      const { treatmentNotes, medication } = req.body;

      // Rule: Notes are mandatory
      if (!treatmentNotes || !treatmentNotes.trim()) {
        res.status(400).json({
          code: 'MANDATORY_NOTES',
          message: 'Treatment notes are mandatory',
        });
        return;
      }

      // Rule: One visit per patient per day (a follow-up note can be appended)
      const existingVisit = await DoctorVisit.findOne({
        patient: patient._id,
        dayKey: today,
      });

      if (existingVisit) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        existingVisit.treatmentNotes = `${existingVisit.treatmentNotes}\n[Follow-up ${timeStr}]: ${treatmentNotes.trim()}`;
        if (medication && medication.trim()) {
          existingVisit.medication = existingVisit.medication
            ? `${existingVisit.medication}; ${medication.trim()}`
            : medication.trim();
        }
        await existingVisit.save();

        await AuditLog.create({
          actor: req.user!.userId,
          action: 'DOCTOR_FOLLOW_UP_VISIT',
          patient: patient._id,
          details: { dayKey: today, treatmentNotes: treatmentNotes.trim(), medication },
        });

        res.json({ message: 'Follow-up visit note appended', visit: existingVisit });
        return;
      }

      const visit = await DoctorVisit.create({
        patient: patient._id,
        doctor: req.user!.userId,
        visitedAt: new Date(),
        dayKey: today,
        treatmentNotes: treatmentNotes.trim(),
        medication: medication ? medication.trim() : '',
      });

      await AuditLog.create({
        actor: req.user!.userId,
        action: 'DOCTOR_VISIT',
        patient: patient._id,
        details: { dayKey: today, medication },
      });

      res.status(201).json(visit);
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/patients/:id/recommend-discharge (doctor) ────────────────────
router.post(
  '/:id/recommend-discharge',
  authorize('doctor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const patient = await Patient.findById(req.params.id);
      if (!patient) {
        res.status(404).json({ code: 'NOT_FOUND', message: 'Patient not found' });
        return;
      }

      // Rule: Discharged or deceased patients are read-only
      if (['DISCHARGED_CURED', 'DECEASED'].includes(patient.status)) {
        res.status(400).json({
          code: 'READ_ONLY',
          message: `Cannot recommend discharge for a ${patient.status} patient`,
        });
        return;
      }

      if (patient.status !== 'ADMITTED') {
        res.status(400).json({
          code: 'INVALID_STATUS',
          message: 'Only ADMITTED patients can be recommended for discharge',
        });
        return;
      }

      // Rule: Recommend Discharge is allowed only at a streak of 3 or more
      const allReadings = await TemperatureReading.find({
        patient: patient._id,
        isCorrection: false,
      })
        .sort({ dayKey: -1 })
        .lean();

      const streak = calcFeverFreeStreak(allReadings.map((r) => ({ dayKey: r.dayKey, valueF: r.valueF })));
      if (streak < 3) {
        res.status(400).json({
          code: 'INELIGIBLE_FOR_DISCHARGE',
          message: `Recommend Discharge is allowed only at a streak of 3 or more fever-free days (current streak: ${streak} days)`,
        });
        return;
      }

      patient.status = 'READY_FOR_DISCHARGE';
      patient.dischargeRecommendedBy = new mongoose.Types.ObjectId(req.user!.userId);
      patient.dischargeRecommendedAt = new Date();
      await patient.save();

      // Notify admin
      await Notification.create({
        toRole: 'admin',
        patient: patient._id,
        type: 'DISCHARGE_READY',
        message: `${patient.name} (Bed ${patient.bedNumber}) is recommended for discharge by ${req.user!.name}`,
      });

      await AuditLog.create({
        actor: req.user!.userId,
        action: 'RECOMMEND_DISCHARGE',
        patient: patient._id,
        details: { bedNumber: patient.bedNumber, streak },
      });

      res.json({ message: 'Discharge recommended', patient });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/patients/:id/approve-discharge (admin) ───────────────────────
router.post(
  '/:id/approve-discharge',
  authorize('admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const patient = await Patient.findById(req.params.id);
      if (!patient) {
        res.status(404).json({ code: 'NOT_FOUND', message: 'Patient not found' });
        return;
      }

      // Rule: Admin only, and only for READY_FOR_DISCHARGE patients
      if (patient.status !== 'READY_FOR_DISCHARGE') {
        res.status(400).json({
          code: 'INVALID_STATUS',
          message: 'Only READY_FOR_DISCHARGE patients can be approved for discharge',
        });
        return;
      }

      const freedBed = patient.bedNumber;

      // Update and unset bedNumber (so sparse index frees the bed)
      const updated = await Patient.findByIdAndUpdate(
        patient._id,
        {
          $set: { status: 'DISCHARGED_CURED', dischargedAt: new Date() },
          $unset: { bedNumber: 1 },
        },
        { new: true }
      );

      await AuditLog.create({
        actor: req.user!.userId,
        action: 'APPROVE_DISCHARGE',
        patient: patient._id,
        details: { freedBed },
      });

      res.json({ message: 'Patient discharged and bed freed', patient: updated });
    } catch (err) {
      next(err);
    }
  }
);

// ─── POST /api/patients/:id/deceased (doctor) ───────────────────────────────
router.post(
  '/:id/deceased',
  authorize('doctor'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const patient = await Patient.findById(req.params.id);
      if (!patient) {
        res.status(404).json({ code: 'NOT_FOUND', message: 'Patient not found' });
        return;
      }

      // Rule: Discharged or deceased patients cannot be re-marked deceased
      if (!['ADMITTED', 'READY_FOR_DISCHARGE'].includes(patient.status)) {
        res.status(400).json({
          code: 'READ_ONLY',
          message: `Cannot mark a ${patient.status} patient as deceased`,
        });
        return;
      }

      const { cause } = req.body;
      if (!cause || !cause.trim()) {
        res.status(400).json({ code: 'MANDATORY_CAUSE', message: 'Cause of death is mandatory' });
        return;
      }

      const freedBed = patient.bedNumber;

      const updated = await Patient.findByIdAndUpdate(
        patient._id,
        {
          $set: { status: 'DECEASED', deceasedAt: new Date(), deathCause: cause.trim() },
          $unset: { bedNumber: 1 },
        },
        { new: true }
      );

      // Notify admin
      await Notification.create({
        toRole: 'admin',
        patient: patient._id,
        type: 'PATIENT_DECEASED',
        message: `${patient.name} (Bed ${freedBed}) has passed away. Cause: ${cause.trim()}`,
      });

      await AuditLog.create({
        actor: req.user!.userId,
        action: 'MARK_DECEASED',
        patient: patient._id,
        details: { cause: cause.trim(), freedBed },
      });

      res.json({ message: 'Patient marked as deceased', patient: updated });
    } catch (err) {
      next(err);
    }
  }
);


export default router;
