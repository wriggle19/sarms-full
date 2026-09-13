import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { UsersTab } from '../settings/UsersTab';
import { DepartmentsTab } from '../settings/DepartmentsTab';
import { LocationsTab } from '../settings/LocationsTab';
import { AcademicYearsTab } from '../settings/AcademicYearsTab';
import { CatalogTab } from '../settings/CatalogTab';
import { RolesTab } from '../settings/RolesTab';

const TABS = [
  { key: 'users', label: 'Users', perm: 'users.view' },
  { key: 'departments', label: 'Departments', perm: 'departments.manage' },
  { key: 'locations', label: 'Locations', perm: 'locations.manage' },
  { key: 'academic-years', label: 'Academic Years', perm: 'academic-years.manage' },
  { key: 'catalog', label: 'Asset Catalog', perm: 'catalog.manage' },
  { key: 'roles', label: 'Roles', perm: 'roles.manage' },
] as const;

export function Settings() {
  const { user, hasPermission } = useAuth();
  const available = TABS.filter((t) => hasPermission(t.perm));
  const [active, setActive] = useState<string>(available.length ? available[0].key : 'users');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-text-primary">Settings · Administration</h1>
        <p className="text-sm text-text-secondary mt-1">Manage the reference data the rest of the system runs on.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {available.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`px-3.5 py-2 rounded text-sm font-medium ${
              active === t.key ? 'bg-primary text-white' : 'bg-white border border-border text-text-secondary hover:bg-canvas'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {user && active === 'users' && hasPermission('users.view') && <UsersTab />}
      {user && active === 'departments' && hasPermission('departments.manage') && <DepartmentsTab />}
      {user && active === 'locations' && hasPermission('locations.manage') && <LocationsTab />}
      {user && active === 'academic-years' && hasPermission('academic-years.manage') && <AcademicYearsTab />}
      {user && active === 'catalog' && hasPermission('catalog.manage') && <CatalogTab />}
      {user && active === 'roles' && hasPermission('roles.manage') && <RolesTab />}
    </div>
  );
}