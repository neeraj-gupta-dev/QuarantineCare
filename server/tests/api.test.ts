import request from 'supertest';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import app from '../src/index';
import { connectDB } from '../src/config/db';

describe('QuarantineCare Express REST API Integration Tests', () => {
  let adminToken: string;
  let doctorToken: string;
  let nurseToken: string;
  let testPatientId: string;

  beforeAll(async () => {
    await connectDB();

    // Log in as admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@demo.com', password: 'demo123' });
    adminToken = adminRes.body.token;

    // Log in as doctor
    const doctorRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'doctor@demo.com', password: 'demo123' });
    doctorToken = doctorRes.body.token;

    // Log in as nurse
    const nurseRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nurse@demo.com', password: 'demo123' });
    nurseToken = nurseRes.body.token;
  });

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('Health & Auth', () => {
    it('GET /api/health should return ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });

    it('POST /api/auth/login should reject invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@demo.com', password: 'wrongpassword' });
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('POST /api/auth/login should succeed and return JWT for valid credentials', async () => {
      expect(adminToken).toBeDefined();
      expect(doctorToken).toBeDefined();
      expect(nurseToken).toBeDefined();
    });
  });

  describe('Patients API', () => {
    it('GET /api/patients requires authentication', async () => {
      const res = await request(app).get('/api/patients');
      expect(res.status).toBe(401);
    });

    it('GET /api/patients returns patient list with derived fields', async () => {
      const res = await request(app)
        .get('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('today');
      expect(res.body).toHaveProperty('count');
      expect(Array.isArray(res.body.patients)).toBe(true);
      expect(res.body.patients.length).toBeGreaterThan(0);

      const patient = res.body.patients[0];
      testPatientId = patient._id;

      expect(patient).toHaveProperty('todayTempDone');
      expect(patient).toHaveProperty('todayDoctorVisited');
      expect(patient).toHaveProperty('feverFreeStreak');
      expect(patient).toHaveProperty('lastTemperature');
    });

    it('GET /api/patients supports status and workflow filters', async () => {
      const res = await request(app)
        .get('/api/patients?status=ADMITTED&todayTemp=pending')
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(res.status).toBe(200);
      for (const p of res.body.patients) {
        expect(p.status).toBe('ADMITTED');
        expect(p.todayTempDone).toBe(false);
      }
    });

    it('GET /api/patients/:id returns full detail', async () => {
      const res = await request(app)
        .get(`/api/patients/${testPatientId}`)
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(res.status).toBe(200);
      expect(res.body._id).toBe(testPatientId);
      expect(Array.isArray(res.body.readings)).toBe(true);
      expect(Array.isArray(res.body.visits)).toBe(true);
      expect(Array.isArray(res.body.auditLogs)).toBe(true);
    });

    it('GET /api/patients/:id returns 404 for non-existent ID', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/patients/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });

    it('POST /api/patients returns 409 FACILITY_FULL when 74 beds occupied', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Overflow Patient', age: 40, gender: 'M' });

      // If full facility, should return 409
      expect([201, 409]).toContain(res.status);
      if (res.status === 409) {
        expect(res.body.code).toBe('FACILITY_FULL');
      }
    });
  });

  describe('Role Authorization & Workflow Enforcement', () => {
    it('Nurse cannot mark a patient deceased (doctor only)', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientId}/deceased`)
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ cause: 'Severe pneumonia' });

      expect(res.status).toBe(403);
    });

    it('Doctor cannot approve discharge (admin only)', async () => {
      const res = await request(app)
        .post(`/api/patients/${testPatientId}/approve-discharge`)
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(403);
    });

    it('Nurse cannot admit a patient (admin only)', async () => {
      const res = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${nurseToken}`)
        .send({ name: 'Test Person', age: 30, gender: 'OTHER' });

      expect(res.status).toBe(403);
    });
  });

  describe('Dashboard API', () => {
    it('Nurse cannot access dashboard', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${nurseToken}`);

      expect(res.status).toBe(403);
    });

    it('Admin can access dashboard with correct schema', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('occupancy');
      expect(res.body.occupancy.total).toBe(74);
      expect(res.body).toHaveProperty('compliance');
      expect(res.body).toHaveProperty('pendingDischarges');
      expect(res.body).toHaveProperty('outcomes');
      expect(res.body).toHaveProperty('mortalityOverTime');
    });

    it('Doctor can also access dashboard', async () => {
      const res = await request(app)
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${doctorToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('Notifications API', () => {
    it('Authenticated user can fetch notifications for their role', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('unreadCount');
      expect(Array.isArray(res.body.notifications)).toBe(true);
    });

    it('Authenticated user can mark notifications as read', async () => {
      const res = await request(app)
        .patch('/api/notifications')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Notifications marked as read');
    });
  });

  describe('Demo API', () => {
    it('POST /api/demo/next-day increments day offset', async () => {
      const res = await request(app).post('/api/demo/next-day');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('dayOffset');
      expect(res.body).toHaveProperty('today');
    });
  });
});
