import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import app from '../src/index';
import { connectDB } from '../src/config/db';
import Patient from '../src/models/Patient';
import TemperatureReading from '../src/models/TemperatureReading';
import DoctorVisit from '../src/models/DoctorVisit';
import Notification from '../src/models/Notification';
import AuditLog from '../src/models/AuditLog';
import { getToday } from '../src/helpers/getToday';

describe('QuarantineCare Clinical Business Rules Enforcement Tests', () => {
  let adminToken: string;
  let doctorToken: string;
  let nurseToken: string;

  let testPatientAdmitted: any;
  let testPatientReady: any;
  let testPatientDischarged: any;
  let todayKey: string;

  beforeAll(async () => {
    await connectDB();

    todayKey = await getToday();

    // Log in
    const [adminRes, doctorRes, nurseRes] = await Promise.all([
      request(app).post('/api/auth/login').send({ email: 'admin@demo.com', password: 'demo123' }),
      request(app).post('/api/auth/login').send({ email: 'doctor@demo.com', password: 'demo123' }),
      request(app).post('/api/auth/login').send({ email: 'nurse@demo.com', password: 'demo123' }),
    ]);

    adminToken = adminRes.body.token;
    doctorToken = doctorRes.body.token;
    nurseToken = nurseRes.body.token;

    // Create isolated test patients
    testPatientAdmitted = await Patient.create({
      name: 'Rules Test Admitted',
      age: 40,
      gender: 'M',
      status: 'ADMITTED',
      admittedAt: new Date(),
    });

    testPatientReady = await Patient.create({
      name: 'Rules Test Ready For Discharge',
      age: 50,
      gender: 'F',
      status: 'READY_FOR_DISCHARGE',
      admittedAt: new Date(),
    });

    testPatientDischarged = await Patient.create({
      name: 'Rules Test Discharged',
      age: 60,
      gender: 'F',
      status: 'DISCHARGED_CURED',
      admittedAt: new Date(),
      dischargedAt: new Date(),
    });
  });

  afterAll(async () => {
    // Clean up test documents
    if (testPatientAdmitted) {
      await Patient.findByIdAndDelete(testPatientAdmitted._id);
      await TemperatureReading.deleteMany({ patient: testPatientAdmitted._id });
      await DoctorVisit.deleteMany({ patient: testPatientAdmitted._id });
      await AuditLog.deleteMany({ patient: testPatientAdmitted._id });
    }
    if (testPatientReady) {
      await Patient.findByIdAndDelete(testPatientReady._id);
      await TemperatureReading.deleteMany({ patient: testPatientReady._id });
      await Notification.deleteMany({ patient: testPatientReady._id });
    }
    if (testPatientDischarged) {
      await Patient.findByIdAndDelete(testPatientDischarged._id);
    }
    await mongoose.disconnect();
  });

  describe('1. Temperature Recording Rules', () => {
    it('Requires nurse role (doctor and admin get 403)', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/temperature`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ valueF: 98.6 });

      expect(res.status).toBe(403);
    });

    it('Rejects temperature below 90.0°F with 400 INVALID_RANGE', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/temperature`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ valueF: 89.9 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_RANGE');
    });

    it('Rejects temperature above 110.0°F with 400 INVALID_RANGE', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/temperature`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ valueF: 110.1 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_RANGE');
    });

    it('Discharged or deceased patients are read-only (returns 400 READ_ONLY)', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientDischarged._id}/temperature`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ valueF: 98.6 });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('READ_ONLY');
    });

    it('Allows recording valid primary temperature reading', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/temperature`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ valueF: 98.6 });

      expect(res.status).toBe(201);
      expect(res.body.valueF).toBe(98.6);
      expect(res.body.dayKey).toBe(todayKey);
    });

    it('Rejects duplicate primary reading today with 409 and detailed message', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/temperature`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ valueF: 98.8 });

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('DUPLICATE_READING');
      expect(res.body.message).toMatch(/Already recorded today at .* by .*/);
      expect(res.body).toHaveProperty('existingReading');
    });

    it('Rejects temperature correction without a reason (400 MANDATORY_CORRECTION_REASON)', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/temperature`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ valueF: 98.7, isCorrection: true, correctionReason: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MANDATORY_CORRECTION_REASON');
    });

    it('Accepts temperature correction with mandatory reason', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/temperature`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          valueF: 98.7,
          isCorrection: true,
          correctionReason: 'Re-tested with oral digital thermometer',
        });

      expect(res.status).toBe(201);
      expect(res.body.isCorrection).toBe(true);
      expect(res.body.correctionReason).toBe('Re-tested with oral digital thermometer');
    });

    it('Critical fever (>=104°F) triggers warning and notification to doctors', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/temperature`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({
          valueF: 104.5,
          isCorrection: true,
          correctionReason: 'Patient febrile spike',
        });

      expect(res.status).toBe(201);
      expect(res.body.warnings).toBeDefined();
      expect(res.body.warnings.some((w: string) => w.includes('Critical fever'))).toBe(true);

      const notif = await Notification.findOne({
        patient: testPatientAdmitted._id,
        type: 'CRITICAL_FEVER',
      });
      expect(notif).toBeDefined();
      expect(notif?.toRole).toBe('doctor');
    });
  });

  describe('2. Fever Spike Auto-Revert on Discharge Recommendation', () => {
    it('Auto-reverts READY_FOR_DISCHARGE patient to ADMITTED if fever spikes and alerts doctor and admin', async () => {
      // Patient is READY_FOR_DISCHARGE
      expect(testPatientReady.status).toBe('READY_FOR_DISCHARGE');

      const res = await request(app)
        .post(`/api/patients/${testPatientReady._id}/temperature`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ valueF: 101.2 }); // Fever reading

      expect(res.status).toBe(201);
      expect(res.body.autoReverted).toBe(true);

      const updated = await Patient.findById(testPatientReady._id);
      expect(updated?.status).toBe('ADMITTED');
      expect(updated?.dischargeRecommendedBy).toBeNull();
      expect(updated?.dischargeRecommendedAt).toBeNull();

      // Notifications created for both doctor and admin
      const notifications = await Notification.find({
        patient: testPatientReady._id,
        type: 'DISCHARGE_REVOKED',
      });
      expect(notifications.length).toBe(2);
      const roles = notifications.map((n) => n.toRole);
      expect(roles).toContain('doctor');
      expect(roles).toContain('admin');
    });
  });

  describe('3. Doctor Visit Rules', () => {
    it('Requires doctor role (nurse gets 403)', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/visit`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ treatmentNotes: 'Notes' });

      expect(res.status).toBe(403);
    });

    it('Blocks visit until today temperature exists with 400 WAITING_FOR_TEMPERATURE', async () => {
      const unmeasuredPatient = await Patient.create({
        name: 'Unmeasured Patient',
        age: 35,
        gender: 'M',
        status: 'ADMITTED',
        admittedAt: new Date(),
      });

      const res = await request(app)
        .post(`/api/patients/${unmeasuredPatient._id}/visit`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ treatmentNotes: 'Attempting visit before temperature' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('WAITING_FOR_TEMPERATURE');
      expect(res.body.message).toBe("Waiting for nurse's temperature reading");

      await Patient.findByIdAndDelete(unmeasuredPatient._id);
    });

    it('Rejects visit if treatment notes are missing (400 MANDATORY_NOTES)', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/visit`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ treatmentNotes: '   ', medication: 'Paracetamol' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MANDATORY_NOTES');
    });

    it('Allows recording primary doctor visit with mandatory notes', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/visit`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          treatmentNotes: 'Morning rounds: patient afebrile, lungs clear.',
          medication: 'Paracetamol 500mg prn',
        });

      expect(res.status).toBe(201);
      expect(res.body.treatmentNotes).toBe('Morning rounds: patient afebrile, lungs clear.');
      expect(res.body.dayKey).toBe(todayKey);
    });

    it('Appends follow-up note if visited a second time today', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/visit`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          treatmentNotes: 'Evening check: vitals stable, continuing hydration.',
          medication: 'Oral rehydration solution',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Follow-up visit note appended');
      expect(res.body.visit.treatmentNotes).toContain('[Follow-up');
      expect(res.body.visit.treatmentNotes).toContain('Evening check: vitals stable');
    });
  });

  describe('4. Streak & Discharge Rules', () => {
    it('Blocks recommend discharge if streak < 3 (400 INELIGIBLE_FOR_DISCHARGE)', async () => {
      // testPatientAdmitted has had fevers today (104.5), streak is 0
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/recommend-discharge`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INELIGIBLE_FOR_DISCHARGE');
      expect(res.body.message).toContain('allowed only at a streak of 3 or more');
    });

    it('Blocks discharge approval by doctor (admin only, 403)', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/approve-discharge`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
    });

    it('Blocks discharge approval if patient is not READY_FOR_DISCHARGE (400 INVALID_STATUS)', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/approve-discharge`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_STATUS');
    });
  });

  describe('5. Mark Deceased Rules', () => {
    it('Blocks mark deceased without cause (400 MANDATORY_CAUSE)', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/deceased`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ cause: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('MANDATORY_CAUSE');
    });

    it('Marks patient deceased with required cause and creates audit log', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/deceased`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ cause: 'Severe refractory hypoxemic respiratory failure' });

      expect(res.status).toBe(200);
      expect(res.body.patient.status).toBe('DECEASED');
      expect(res.body.patient.deathCause).toBe('Severe refractory hypoxemic respiratory failure');

      const audit = await AuditLog.findOne({
        patient: testPatientAdmitted._id,
        action: 'MARK_DECEASED',
      });
      expect(audit).toBeDefined();
    });

    it('Rejects marking an already deceased patient (400 READ_ONLY)', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientAdmitted._id}/deceased`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ cause: 'Another cause' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('READ_ONLY');
    });
  });
});
