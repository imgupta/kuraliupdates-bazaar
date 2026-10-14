import React from 'react';
import { createRoot } from 'react-dom/client';
import { PortalAppShell } from './PortalAppShell';
import type { UserRole } from '../types';
import '../index.css';

export function mountPortal(portalRole: UserRole, Dashboard: React.ComponentType<any>): void {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Missing #root mount element');
  createRoot(rootElement).render(<PortalAppShell portalRole={portalRole} Dashboard={Dashboard} />);
}
