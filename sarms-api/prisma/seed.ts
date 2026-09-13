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
          'assets.transfer', 'requests.view', 'catalog.manage', 'maintenance.manage',
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
  const adminPasswordHash = await bcrypt.hash('ChangeMe123!', 12);
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
  const dummyPasswordHash = await bcrypt.hash('ChangeMe123!', 12);

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

  console.log('Seed complete.');
  console.log(`Log in as admin@sarms.local / ChangeMe123! and change the password immediately.`);
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
