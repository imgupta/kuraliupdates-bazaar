import React from 'react';
import { createRoot } from 'react-dom/client';
import { PortalAppShell } from './PortalAppShell';
import type { UserRole } from '../types';
import '../index.css';
import { installSecureApiFetch } from '../services/http/secureApiFetch';

export function mountPortal(portalRole: UserRole, Dashboard: React.ComponentType<any>): void {
  // Every standalone role portal must install the same cookie/CSRF/device transport.
  installSecureApiFetch();
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Missing #root mount element');
  createRoot(rootElement).render(<PortalAppShell portalRole={portalRole} Dashboard={Dashboard} />);
}
