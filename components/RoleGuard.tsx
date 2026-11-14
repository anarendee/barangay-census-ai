'use client';

type BarangayRole = 'secretary' | 'treasurer' | 'admin';

interface RoleGuardProps {
  allowedRole: BarangayRole;
  children: React.ReactNode;
}

export default function RoleGuard({ children }: RoleGuardProps) {
  return <>{children}</>;
}
