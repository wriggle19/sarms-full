import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const PERMISSIONS = [
  'users.view', 'users.create', 'users.edit',
  'roles.manage',
  'departments.manage',
  'locations.manage',
  'academic-years.manage',
  'catalog.manage',
  'assets.view', 'assets.create', 'assets.edit', 'assets.delete',
  'assets.issue', 'assets.return', 'assets.transfer',
  'requests.create', 'requests.view', 'requests.approve',
  'workflows.manage',
  'finance.view',
  'procurement.manage',
  'maintenance.manage',
  'disposal.approve',
  'stocktake.manage',
  'audit.view',
];

async function main() {
  // ---------------------------------------------------------------------
  // PRODUCTION SAFETY GUARD
  // ---------------------------------------------------------------------
  // This script creates well-known accounts (admin@sarms.local etc.) and is
  // therefore destructive-by-convention on a live system. Refuse to run
  // against production unless the operator explicitly opts in.
  //
  // Allowed when:
  //   - NODE_ENV is not "production", OR
  //   - SEED_ALLOW_PRODUCTION=true is set (explicit opt-in), OR
  //   - --force is passed on the command line.
  //
  // In production we additionally require SEED_ADMIN_PASSWORD so no
  // well-known default credential can ever be created on a live database.
  const isProduction = process.env.NODE_ENV === 'production';
  const forced =
    process.env.SEED_ALLOW_PRODUCTION === 'true' || process.argv.includes('--force');

  if (isProduction && !forced) {
    console.error(
      'REFUSING TO SEED: NODE_ENV=production.\n' +
        'Seeding creates default accounts (admin@sarms.local). If you really ' +
        'intend to seed this production database, re-run with an explicit ' +
        'opt-in:\n\n' +
        '  SEED_ALLOW_PRODUCTION=true SEED_ADMIN_PASSWORD="<strong-password>" npm run seed\n' +
        '  # or: NODE_ENV=production npm run seed -- --force\n',
    );
    process.exit(1);
  }

  if (isProduction && !process.env.SEED_ADMIN_PASSWORD) {
    console.error(
      'REFUSING TO SEED: SEED_ADMIN_PASSWORD must be set when seeding in production.\n' +
        'A default/well-known admin password must never be created on a live system.',
    );
    process.exit(1);
  }
  // Permissions
  for (const code of PERMISSIONS) {
    await prisma.permission.upsert({ where: { code }, update: {}, create: { code } });
  }

  // Roles
  const superAdminRole = await prisma.role.upsert({
    where: { name: 'Super Administrator' },
    update: {},
    create: { name: 'Super Administrator', isSystem: true },
  });
  const allPermissions = await prisma.permission.findMany();
  await prisma.rolePermission.deleteMany({ where: { roleId: superAdminRole.id } });
  await prisma.rolePermission.createMany({
    data: allPermissions.map((p) => ({ roleId: superAdminRole.id, permissionId: p.id })),
  });

  const teacherRole = await prisma.role.upsert({
    where: { name: 'Teacher' },
    update: {},
    create: { name: 'Teacher' },
  });
  const teacherPerms = await prisma.permission.findMany({
    where: { code: { in: ['requests.create', 'requests.view', 'assets.view'] } },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: teacherRole.id } });
  await prisma.rolePermission.createMany({
    data: teacherPerms.map((p) => ({ roleId: teacherRole.id, permissionId: p.id })),
  });

  const itOfficerRole = await prisma.role.upsert({
    where: { name: 'IT Asset Officer' },
    update: {},
    create: { name: 'IT Asset Officer' },
  });
  const itPerms = await prisma.permission.findMany({
    where: {
      code: {
        in: [
          'assets.view', 'assets.create', 'assets.edit', 'assets.issue', 'assets.return',
          'assets.transfer', 'requests.view', 'requests.approve', 'catalog.manage',
          'maintenance.manage',
        ],
      },
    },
  });
  await prisma.rolePermission.deleteMany({ where: { roleId: itOfficerRole.id } });
  await prisma.rolePermission.createMany({
    data: itPerms.map((p) => ({ roleId: itOfficerRole.id, permissionId: p.id })),
  });

  // Asset statuses
  const statuses = [
    { code: 'AVAILABLE', label: 'Available', colorHex: '#16a34a' },
    { code: 'RESERVED', label: 'Reserved', colorHex: '#eab308' },
    { code: 'ASSIGNED', label: 'Assigned', colorHex: '#2563eb' },
    { code: 'ON_LOAN', label: 'On Loan', colorHex: '#2563eb' },
    { code: 'MAINTENANCE', label: 'Under Maintenance', colorHex: '#f97316' },
    { code: 'LOST', label: 'Lost', colorHex: '#dc2626' },
    { code: 'STOLEN', label: 'Stolen', colorHex: '#dc2626' },
    { code: 'DAMAGED', label: 'Damaged', colorHex: '#dc2626' },
    { code: 'RETIRED', label: 'Retired', colorHex: '#6b7280' },
    { code: 'DISPOSED', label: 'Disposed', colorHex: '#374151' },
  ];
  for (const s of statuses) {
    await prisma.assetStatus.upsert({ where: { code: s.code }, update: {}, create: s });
  }

  // Asset conditions
  const conditions = [
    { code: 'NEW', label: 'New', rank: 1 },
    { code: 'EXCELLENT', label: 'Excellent', rank: 2 },
    { code: 'GOOD', label: 'Good', rank: 3 },
    { code: 'FAIR', label: 'Fair', rank: 4 },
    { code: 'POOR', label: 'Poor', rank: 5 },
    { code: 'DAMAGED', label: 'Damaged', rank: 6 },
    { code: 'BEYOND_REPAIR', label: 'Beyond Repair', rank: 7 },
  ];
  for (const c of conditions) {
    await prisma.assetCondition.upsert({ where: { code: c.code }, update: {}, create: c });
  }

  // Departments
  const itDept = await prisma.department.upsert({
    where: { code: 'IT' },
    update: {},
    create: { name: 'IT / Technology', code: 'IT' },
  });
  const mathDept = await prisma.department.upsert({
    where: { code: 'MATH' },
    update: {},
    create: { name: 'Mathematics Department', code: 'MATH' },
  });

  // Campus / building / floor / room
  const campus = await prisma.campus.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Main Campus' },
  });
  const building = await prisma.building.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Secondary Building', campusId: campus.id },
  });
  const floor = await prisma.floor.upsert({
    where: { id: 1 },
    update: {},
    create: { label: '2nd Floor', buildingId: building.id },
  });
  const room = await prisma.room.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Classroom 201', floorId: floor.id, type: 'CLASSROOM', departmentId: mathDept.id },
  });

  // Academic year
  await prisma.academicYear.upsert({
    where: { label: '2026/2027' },
    update: {},
    create: {
      label: '2026/2027',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2027-06-30'),
      isCurrent: true,
    },
  });

  // Asset category
  const laptopCategory = await prisma.assetCategory.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Laptop' },
  });

  // Admin user
  // Seed password: SEED_ADMIN_PASSWORD is authoritative. The fallback below
  // is strictly for local development - the production guard at the top of
  // main() guarantees it can never be reached with NODE_ENV=production.
  const seedPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
  if (!process.env.SEED_ADMIN_PASSWORD) {
    console.warn(
      'WARNING: SEED_ADMIN_PASSWORD not set - using the development placeholder. ' +
        'Never use this outside local development.',
    );
  }
  const adminPasswordHash = await bcrypt.hash(seedPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sarms.local' },
    update: {},
    create: {
      fullName: 'System Administrator',
      email: 'admin@sarms.local',
      passwordHash: adminPasswordHash,
      departmentId: itDept.id,
      status: 'ACTIVE',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: superAdminRole.id },
  });

  // Dummy users for exercising different roles. Each has a unique permission
  // footprint so you can verify per-role behaviour through the UI:
  //   - teacher@sarms.local  -> Teacher          (requests.create/view, assets.view)
  //   - officer@sarms.local  -> IT Asset Officer (assets.issue/return/transfer, create, ...)
  const dummyPasswordHash = await bcrypt.hash(seedPassword, 12);

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@sarms.local' },
    update: {},
    create: {
      fullName: 'Dummy Teacher',
      email: 'teacher@sarms.local',
      passwordHash: dummyPasswordHash,
      departmentId: mathDept.id,
      status: 'ACTIVE',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: teacher.id, roleId: teacherRole.id } },
    update: {},
    create: { userId: teacher.id, roleId: teacherRole.id },
  });

  const officer = await prisma.user.upsert({
    where: { email: 'officer@sarms.local' },
    update: {},
    create: {
      fullName: 'Dummy IT Officer',
      email: 'officer@sarms.local',
      passwordHash: dummyPasswordHash,
      departmentId: itDept.id,
      status: 'ACTIVE',
    },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: officer.id, roleId: itOfficerRole.id } },
    update: {},
    create: { userId: officer.id, roleId: itOfficerRole.id },
  });

  // A default, generic approval workflow so requests don't hit a dead end
  // out of the box: Line Manager -> IT Asset Officer role.
  const existingDefault = await prisma.approvalWorkflow.findFirst({
    where: { name: 'Default Workflow' },
  });
  if (!existingDefault) {
    await prisma.approvalWorkflow.create({
      data: {
        name: 'Default Workflow',
        appliesToRequestType: null,
        isActive: true,
        steps: {
          create: [
            { stepOrder: 1, approverType: 'LINE_MANAGER' },
            { stepOrder: 2, approverType: 'ROLE', approverRoleId: itOfficerRole.id },
          ],
        },
      },
    });
  }

  // ---- Notification templates (Section 27) ----
  const TEMPLATES: { eventKey: string; subject: string; bodyTemplate: string }[] = [
    { eventKey: 'REQUEST_SUBMITTED', subject: 'New equipment request awaiting approval', bodyTemplate: 'A new request has been submitted and requires your review.' },
    { eventKey: 'REQUEST_APPROVED', subject: 'Your equipment request was approved', bodyTemplate: 'Your request has been approved. IT will contact you about collection.' },
    { eventKey: 'REQUEST_REJECTED', subject: 'Your equipment request was rejected', bodyTemplate: 'Unfortunately your request was rejected. See the approval comments.' },
    { eventKey: 'EQUIPMENT_READY', subject: 'Your equipment is ready for pickup', bodyTemplate: 'The equipment you requested is ready for collection from the asset office.' },
    { eventKey: 'EQUIPMENT_ISSUED', subject: 'Equipment issued to you', bodyTemplate: 'Equipment has been issued to you. Please acknowledge receipt and check the condition.' },
    { eventKey: 'LOAN_DUE_SOON', subject: 'Equipment return due soon', bodyTemplate: 'Equipment in your custody is due for return soon. Please plan the return.' },
    { eventKey: 'LOAN_OVERDUE', subject: 'OVERDUE: Equipment return overdue', bodyTemplate: 'Equipment in your custody is now overdue for return. Please return it immediately.' },
    { eventKey: 'WARRANTY_EXPIRING', subject: 'Warranty expiring soon', bodyTemplate: 'The warranty on one of your department\'s assets expires within 30 days.' },
    { eventKey: 'STOCKTICK_REMINDER', subject: 'Stocktake reminder', bodyTemplate: 'A stocktake is in progress and items in your area are pending verification.' },
  ];
  for (const t of TEMPLATES) {
    await prisma.notificationTemplate.upsert({
      where: { eventKey: t.eventKey },
      update: { subject: t.subject, bodyTemplate: t.bodyTemplate },
      create: t,
    });
  }
  // Key school calendar dates (Section 45) for the current academic year.
  let ay = await prisma.academicYear.findFirst({ where: { isCurrent: true } });
  if (!ay) {
    // No year flagged current yet - promote the latest one so calendar dates,
    // default assignment years etc. have something to point at.
    ay = await prisma.academicYear.findFirst({ orderBy: { id: 'desc' } });
    if (ay) {
      await prisma.academicYear.update({ where: { id: ay.id }, data: { isCurrent: true } });
      console.log(`Marked academic year ${ay.label} as current.`);
    }
  }
  if (ay && (await prisma.schoolCalendarEvent.count()) === 0) {
    const y = ay.label.match(/(\d{4})\s*\/\s*(\d{4})/);
    const start = y ? new Date(`${y[1]}-09-01`) : new Date('2026-09-01');
    const end = y ? new Date(`${y[2]}-06-30`) : new Date('2027-06-30');
    const d = (base: Date, days: number) => new Date(base.getTime() + days * 86400000);
    const EVENTS: { eventType: any; title: string; date: Date }[] = [
      { eventType: 'ACADEMIC_YEAR_START', title: `${ay.label} start`, date: start },
      { eventType: 'TEACHER_RETURN', title: 'Teachers return', date: d(start, -7) },
      { eventType: 'STUDENT_RETURN', title: 'Students return', date: d(start, -3) },
      { eventType: 'EQUIPMENT_RETURN_DEADLINE', title: 'Equipment return deadline', date: d(end, -14) },
      { eventType: 'STAFF_CLEARANCE_DEADLINE', title: 'Staff clearance deadline', date: d(end, -7) },
      { eventType: 'ACADEMIC_YEAR_END', title: `${ay.label} end`, date: end },
      { eventType: 'INVENTORY_DATE', title: 'Annual inventory', date: d(end, 7) },
    ];
    for (const e of EVENTS) {
      await prisma.schoolCalendarEvent.create({
        data: { academicYearId: ay.id, eventType: e.eventType, title: e.title, eventDate: e.date },
      });
    }
    console.log(`Seeded ${EVENTS.length} calendar events for ${ay.label}.`);
  }

  console.log('Seed complete.');

  console.log('Seed complete.');
  console.log(`Log in as admin@sarms.local with the SEED_ADMIN_PASSWORD value (default ChangeMe123!) and change it immediately.`);
  console.log({ itDept, mathDept, campus, building, floor, room, laptopCategory });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
