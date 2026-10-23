/**
 * QuarantineCare — Seed Script
 *
 * Creates demo data:
 * - 3 users (nurse, doctor, admin)
 * - 74 admitted patients (beds 1–74) with 7–10 days of temperature history
 * - ~20 discharged patients (DISCHARGED_CURED)
 * - 4 deceased patients (DECEASED)
 * - Matching DoctorVisit records for each temperature reading
 * - Notifications for READY_FOR_DISCHARGE patients
 * - dayOffset setting initialized to 0
 *
 * Run: npm run seed
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../config/db';
import User from '../models/User';
import Patient from '../models/Patient';
import TemperatureReading from '../models/TemperatureReading';
import DoctorVisit from '../models/DoctorVisit';
import Notification from '../models/Notification';
import AuditLog from '../models/AuditLog';
import Setting from '../models/Setting';
import { computeDateKey } from '../helpers/getToday';
import { isFever, formatDayKey } from '../helpers/businessRules';

// ─── Name pools ──────────────────────────────────────────────────────────────

const FIRST_NAMES_M = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
  'Krishna', 'Ishaan', 'Shaurya', 'Atharv', 'Advik', 'Dhruv', 'Kabir',
  'Ritvik', 'Aarush', 'Kian', 'Darsh', 'Arnav', 'Rudra', 'Laksh', 'Pranav',
  'Rohan', 'Kartik', 'Nikhil', 'Rahul', 'Amit', 'Suresh', 'Rakesh',
  'Vikram', 'Deepak', 'Anand', 'Manoj', 'Sanjay', 'Ravi', 'Gaurav', 'Harsh',
  'Kunal', 'Mohit', 'Sahil', 'Tarun', 'Varun', 'Yash', 'Ajay',
];

const FIRST_NAMES_F = [
  'Aanya', 'Diya', 'Saanvi', 'Ananya', 'Aadhya', 'Isha', 'Riya', 'Priya',
  'Meera', 'Kavya', 'Avni', 'Siya', 'Tara', 'Nisha', 'Pooja', 'Sneha',
  'Divya', 'Neha', 'Shweta', 'Anjali', 'Kriti', 'Sakshi', 'Megha', 'Tanvi',
  'Jyoti', 'Swati', 'Pallavi', 'Shruti', 'Nikita', 'Rashmi', 'Komal',
  'Bhavna', 'Deepika', 'Garima', 'Heena', 'Ira', 'Janvi', 'Kiara',
  'Lavanya', 'Mahi', 'Navya', 'Oviya', 'Paridhi', 'Ridhi', 'Sonali',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Patel', 'Singh', 'Kumar', 'Reddy', 'Nair',
  'Rao', 'Joshi', 'Desai', 'Mehta', 'Shah', 'Iyer', 'Pillai', 'Menon',
  'Das', 'Bose', 'Sen', 'Chatterjee', 'Banerjee', 'Mukherjee', 'Ghosh',
  'Mishra', 'Pandey', 'Tiwari', 'Dubey', 'Srivastava', 'Yadav', 'Chauhan',
];

const MEDICATIONS = [
  'Paracetamol 500mg q6h', 'Ibuprofen 400mg q8h', 'Azithromycin 500mg OD',
  'Doxycycline 100mg BD', 'Oseltamivir 75mg BD', 'Remdesivir 200mg IV day 1',
  'Dexamethasone 6mg OD', 'Enoxaparin 40mg SC OD', 'Vitamin C 1000mg OD',
  'Zinc 50mg OD', 'Amoxicillin 500mg TDS', 'Cetirizine 10mg OD',
];

const TREATMENT_NOTES = [
  'Patient responding well to treatment. Continue current medications.',
  'Fever persists. Adjusted medication dosage.',
  'Vitals stable. Monitor overnight.',
  'Patient reports mild improvement. Continue supportive care.',
  'Slight temperature elevation. Added antipyretic.',
  'Patient comfortable. Encourage oral hydration.',
  'Chest clear on auscultation. Continue current plan.',
  'Temperature trending down. Positive progress.',
  'Patient fatigued but stable. Rest recommended.',
  'Good recovery trajectory. May consider step-down care.',
  'SpO2 normal. No respiratory distress.',
  'Appetite improving. Nutritional support continued.',
];

const DEATH_CAUSES = [
  'Acute respiratory distress syndrome (ARDS)',
  'Multi-organ failure secondary to viral sepsis',
  'Viral myocarditis with cardiac arrest',
  'Fulminant hepatic failure',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomTemp(hasFever: boolean): number {
  if (hasFever) {
    // Fever range: 100.4 – 104.0 °F
    return Math.round((100.4 + Math.random() * 3.6) * 10) / 10;
  }
  // Normal range: 96.5 – 99.5 °F
  return Math.round((96.5 + Math.random() * 3.0) * 10) / 10;
}

function generateDayKeys(todayKey: string, numDays: number): string[] {
  const [y, m, d] = todayKey.split('-').map(Number);
  const today = new Date(y, m - 1, d);
  const days: string[] = [];
  for (let i = numDays - 1; i >= 0; i--) {
    const past = new Date(today);
    past.setDate(past.getDate() - i);
    days.push(formatDayKey(past));
  }
  return days;
}

function generateName(gender: 'M' | 'F'): string {
  const first = gender === 'M' ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
  return `${first} ${pick(LAST_NAMES)}`;
}

// ─── Temperature pattern generators ─────────────────────────────────────────

type TempPattern = 'spiking' | 'improving_1_2' | 'ready_for_discharge' | 'mixed';

function generateTemps(days: string[], pattern: TempPattern): { dayKey: string; valueF: number }[] {
  const numDays = days.length;
  const temps: { dayKey: string; valueF: number }[] = [];

  switch (pattern) {
    case 'spiking':
      // Most days have fever, including recent days
      for (let i = 0; i < numDays; i++) {
        const hasFever = i < numDays - 2 ? Math.random() < 0.6 : true; // last 2 days always fever
        temps.push({ dayKey: days[i], valueF: randomTemp(hasFever) });
      }
      break;

    case 'improving_1_2':
      // Had fevers earlier, last 1-2 days are fever-free
      {
        const feverFreeDays = rand(1, 2);
        for (let i = 0; i < numDays; i++) {
          const daysFromEnd = numDays - 1 - i;
          const hasFever = daysFromEnd >= feverFreeDays ? Math.random() < 0.65 : false;
          temps.push({ dayKey: days[i], valueF: randomTemp(hasFever) });
        }
      }
      break;

    case 'ready_for_discharge':
      // Had fevers then recovered — last 3+ days fever-free
      {
        const feverFreeDays = rand(3, 5);
        for (let i = 0; i < numDays; i++) {
          const daysFromEnd = numDays - 1 - i;
          const hasFever = daysFromEnd >= feverFreeDays;
          temps.push({ dayKey: days[i], valueF: randomTemp(hasFever) });
        }
      }
      break;

    case 'mixed':
      // Random pattern
      for (let i = 0; i < numDays; i++) {
        temps.push({ dayKey: days[i], valueF: randomTemp(Math.random() < 0.4) });
      }
      break;
  }

  return temps;
}

// ─── Deceased patient temps ──────────────────────────────────────────────────

function generateDeceasedTemps(days: string[]): { dayKey: string; valueF: number }[] {
  // Persistent high fevers, escalating toward the end
  return days.map((dayKey, i) => {
    const severity = 100.4 + (i / days.length) * 3.5 + Math.random() * 0.5;
    return { dayKey, valueF: Math.round(severity * 10) / 10 };
  });
}

// ─── Discharged patient temps ────────────────────────────────────────────────

function generateDischargedTemps(days: string[]): { dayKey: string; valueF: number }[] {
  // Recovery arc: fevers early → fever-free last 3+ days
  const feverFreeDays = rand(3, 5);
  return days.map((dayKey, i) => {
    const daysFromEnd = days.length - 1 - i;
    const hasFever = daysFromEnd >= feverFreeDays;
    return { dayKey, valueF: randomTemp(hasFever) };
  });
}

// ─── Main seed function ──────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Starting QuarantineCare seed...\n');

  await connectDB();

  // Drop the entire database for a fully clean slate (removes all stale indexes)
  console.log('🗑️  Dropping database...');
  await mongoose.connection.db!.dropDatabase();

  // Re-sync all model indexes (creates collections + indexes from scratch)
  console.log('🔄 Syncing model indexes...');
  await Promise.all([
    User.createIndexes(),
    Patient.createIndexes(),
    TemperatureReading.createIndexes(),
    DoctorVisit.createIndexes(),
    Notification.createIndexes(),
    AuditLog.createIndexes(),
    Setting.createIndexes(),
  ]);

  // ─── Settings ────────────────────────────────────────────────────────────

  await Setting.create({ key: 'dayOffset', value: 0 });
  console.log('⚙️  Created dayOffset setting (0)');

  // ─── Users ───────────────────────────────────────────────────────────────

  const passwordHash = await bcrypt.hash('demo123', 10);

  const [nurse, doctor, admin] = await User.create([
    { name: 'Priya Sharma (Nurse)', email: 'nurse@demo.com', passwordHash, role: 'nurse' },
    { name: 'Dr. Arjun Patel', email: 'doctor@demo.com', passwordHash, role: 'doctor' },
    { name: 'Meera Singh (Admin)', email: 'admin@demo.com', passwordHash, role: 'admin' },
  ]);

  console.log('👤 Created 3 demo users: nurse@demo.com, doctor@demo.com, admin@demo.com');

  const todayKey = computeDateKey();
  console.log(`📅 Today's date key: ${todayKey}\n`);

  // ─── Admitted patients (74, beds 1–74) ───────────────────────────────────

  console.log('🏥 Creating 74 admitted patients...');

  // Distribution: 20 spiking, 25 improving, 15 ready, 14 mixed
  const patterns: TempPattern[] = [
    ...Array(20).fill('spiking' as TempPattern),
    ...Array(25).fill('improving_1_2' as TempPattern),
    ...Array(15).fill('ready_for_discharge' as TempPattern),
    ...Array(14).fill('mixed' as TempPattern),
  ];

  // Shuffle patterns
  for (let i = patterns.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [patterns[i], patterns[j]] = [patterns[j], patterns[i]];
  }

  const tempReadingsBulk: Array<{
    patient: mongoose.Types.ObjectId;
    valueF: number;
    recordedBy: mongoose.Types.ObjectId;
    recordedAt: Date;
    dayKey: string;
    isCorrection: boolean;
  }> = [];

  const doctorVisitsBulk: Array<{
    patient: mongoose.Types.ObjectId;
    doctor: mongoose.Types.ObjectId;
    visitedAt: Date;
    dayKey: string;
    treatmentNotes: string;
    medication: string;
  }> = [];

  const notificationsBulk: Array<{
    toRole: string;
    patient: mongoose.Types.ObjectId;
    type: string;
    message: string;
    read: boolean;
  }> = [];

  for (let bed = 1; bed <= 74; bed++) {
    const gender: 'M' | 'F' = Math.random() < 0.5 ? 'M' : 'F';
    const numDays = rand(7, 10);
    const daysAgo = numDays - 1;
    const admittedDate = new Date();
    admittedDate.setDate(admittedDate.getDate() - daysAgo);

    const pattern = patterns[bed - 1];
    const days = generateDayKeys(todayKey, numDays);
    const temps = generateTemps(days, pattern);

    // Determine status
    const isReady = pattern === 'ready_for_discharge';
    const status = isReady ? 'READY_FOR_DISCHARGE' : 'ADMITTED';

    const patient = await Patient.create({
      name: generateName(gender),
      age: rand(18, 85),
      gender,
      bedNumber: bed,
      admittedAt: admittedDate,
      status,
      notes: isReady ? 'Patient has been fever-free for 3+ consecutive days.' : '',
      dischargeRecommendedBy: isReady ? doctor._id : null,
      dischargeRecommendedAt: isReady ? new Date() : null,
    });

    // Create temperature readings and doctor visits for each day
    for (const temp of temps) {
      const [y, m, d] = temp.dayKey.split('-').map(Number);
      const readingTime = new Date(y, m - 1, d, rand(6, 10), rand(0, 59));
      const visitTime = new Date(y, m - 1, d, rand(11, 16), rand(0, 59));

      tempReadingsBulk.push({
        patient: patient._id as mongoose.Types.ObjectId,
        valueF: temp.valueF,
        recordedBy: nurse._id as mongoose.Types.ObjectId,
        recordedAt: readingTime,
        dayKey: temp.dayKey,
        isCorrection: false,
      });

      doctorVisitsBulk.push({
        patient: patient._id as mongoose.Types.ObjectId,
        doctor: doctor._id as mongoose.Types.ObjectId,
        visitedAt: visitTime,
        dayKey: temp.dayKey,
        treatmentNotes: pick(TREATMENT_NOTES),
        medication: pick(MEDICATIONS),
      });
    }

    // Notification for ready-for-discharge patients
    if (isReady) {
      notificationsBulk.push({
        toRole: 'admin',
        patient: patient._id as mongoose.Types.ObjectId,
        type: 'DISCHARGE_READY',
        message: `${patient.name} (Bed ${bed}) is ready for discharge — 3+ fever-free days.`,
        read: false,
      });
    }
  }

  // ─── Discharged patients (~20) ───────────────────────────────────────────

  console.log('✅ Creating ~20 discharged patients...');

  for (let i = 0; i < 20; i++) {
    const gender: 'M' | 'F' = Math.random() < 0.5 ? 'M' : 'F';
    const numDays = rand(8, 14);
    const dischargedDaysAgo = rand(1, 30);
    const admittedDaysAgo = dischargedDaysAgo + numDays;

    const admittedDate = new Date();
    admittedDate.setDate(admittedDate.getDate() - admittedDaysAgo);
    const dischargedDate = new Date();
    dischargedDate.setDate(dischargedDate.getDate() - dischargedDaysAgo);

    // Generate day keys for their stay (ending dischargedDaysAgo from today)
    const [ty, tm, td] = todayKey.split('-').map(Number);
    const dischargeDay = new Date(ty, tm - 1, td - dischargedDaysAgo);
    const dischargeDayKey = formatDayKey(dischargeDay);
    const days = generateDayKeys(dischargeDayKey, numDays);
    const temps = generateDischargedTemps(days);

    const patient = await Patient.create({
      name: generateName(gender),
      age: rand(18, 85),
      gender,
      admittedAt: admittedDate,
      status: 'DISCHARGED_CURED',
      notes: 'Patient recovered and discharged.',
      dischargeRecommendedBy: doctor._id,
      dischargeRecommendedAt: dischargedDate,
      dischargedAt: dischargedDate,
    });

    for (const temp of temps) {
      const [y, m, d] = temp.dayKey.split('-').map(Number);
      const readingTime = new Date(y, m - 1, d, rand(6, 10), rand(0, 59));
      const visitTime = new Date(y, m - 1, d, rand(11, 16), rand(0, 59));

      tempReadingsBulk.push({
        patient: patient._id as mongoose.Types.ObjectId,
        valueF: temp.valueF,
        recordedBy: nurse._id as mongoose.Types.ObjectId,
        recordedAt: readingTime,
        dayKey: temp.dayKey,
        isCorrection: false,
      });

      doctorVisitsBulk.push({
        patient: patient._id as mongoose.Types.ObjectId,
        doctor: doctor._id as mongoose.Types.ObjectId,
        visitedAt: visitTime,
        dayKey: temp.dayKey,
        treatmentNotes: pick(TREATMENT_NOTES),
        medication: pick(MEDICATIONS),
      });
    }
  }

  // ─── Deceased patients (4) ───────────────────────────────────────────────

  console.log('💀 Creating 4 deceased patients...');

  for (let i = 0; i < 4; i++) {
    const gender: 'M' | 'F' = Math.random() < 0.5 ? 'M' : 'F';
    const numDays = rand(5, 10);
    const deceasedDaysAgo = rand(2, 25);
    const admittedDaysAgo = deceasedDaysAgo + numDays;

    const admittedDate = new Date();
    admittedDate.setDate(admittedDate.getDate() - admittedDaysAgo);
    const deceasedDate = new Date();
    deceasedDate.setDate(deceasedDate.getDate() - deceasedDaysAgo);

    const [ty, tm, td] = todayKey.split('-').map(Number);
    const deathDay = new Date(ty, tm - 1, td - deceasedDaysAgo);
    const deathDayKey = formatDayKey(deathDay);
    const days = generateDayKeys(deathDayKey, numDays);
    const temps = generateDeceasedTemps(days);

    const patient = await Patient.create({
      name: generateName(gender),
      age: rand(45, 85), // Deceased tend to be older
      gender,
      admittedAt: admittedDate,
      status: 'DECEASED',
      notes: 'Patient did not respond to treatment.',
      deceasedAt: deceasedDate,
      deathCause: DEATH_CAUSES[i],
    });

    for (const temp of temps) {
      const [y, m, d] = temp.dayKey.split('-').map(Number);
      const readingTime = new Date(y, m - 1, d, rand(6, 10), rand(0, 59));
      const visitTime = new Date(y, m - 1, d, rand(11, 16), rand(0, 59));

      tempReadingsBulk.push({
        patient: patient._id as mongoose.Types.ObjectId,
        valueF: temp.valueF,
        recordedBy: nurse._id as mongoose.Types.ObjectId,
        recordedAt: readingTime,
        dayKey: temp.dayKey,
        isCorrection: false,
      });

      doctorVisitsBulk.push({
        patient: patient._id as mongoose.Types.ObjectId,
        doctor: doctor._id as mongoose.Types.ObjectId,
        visitedAt: visitTime,
        dayKey: temp.dayKey,
        treatmentNotes: pick(TREATMENT_NOTES),
        medication: pick(MEDICATIONS),
      });
    }
  }

  // ─── Bulk insert readings, visits, notifications ─────────────────────────

  console.log(`\n📊 Inserting ${tempReadingsBulk.length} temperature readings...`);
  await TemperatureReading.insertMany(tempReadingsBulk);

  console.log(`🩺 Inserting ${doctorVisitsBulk.length} doctor visits...`);
  await DoctorVisit.insertMany(doctorVisitsBulk);

  if (notificationsBulk.length > 0) {
    console.log(`🔔 Inserting ${notificationsBulk.length} notifications...`);
    await Notification.insertMany(notificationsBulk);
  }

  // ─── Summary ─────────────────────────────────────────────────────────────

  const admittedCount = await Patient.countDocuments({ status: { $in: ['ADMITTED', 'READY_FOR_DISCHARGE'] } });
  const readyCount = await Patient.countDocuments({ status: 'READY_FOR_DISCHARGE' });
  const dischargedCount = await Patient.countDocuments({ status: 'DISCHARGED_CURED' });
  const deceasedCount = await Patient.countDocuments({ status: 'DECEASED' });
  const totalPatients = await Patient.countDocuments();
  const totalReadings = await TemperatureReading.countDocuments();
  const totalVisits = await DoctorVisit.countDocuments();

  console.log('\n' + '='.repeat(50));
  console.log('🌱 SEED COMPLETE');
  console.log('='.repeat(50));
  console.log(`👤 Users:                  3`);
  console.log(`🏥 Total patients:         ${totalPatients}`);
  console.log(`   ├─ Admitted:            ${admittedCount - readyCount}`);
  console.log(`   ├─ Ready for discharge: ${readyCount}`);
  console.log(`   ├─ Discharged (cured):  ${dischargedCount}`);
  console.log(`   └─ Deceased:            ${deceasedCount}`);
  console.log(`🌡️  Temperature readings:   ${totalReadings}`);
  console.log(`🩺 Doctor visits:          ${totalVisits}`);
  console.log(`📈 Mortality rate:         ${((deceasedCount / totalPatients) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));

  await disconnectDB();
  console.log('\n✅ Done!');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
