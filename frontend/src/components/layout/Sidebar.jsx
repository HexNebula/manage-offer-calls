import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Bell,
  BarChart2,
  Shield,
  ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import logo from '../../assets/Nplus-one-logo-1.png';

const navItems = [
  {
    label: 'Tableau de bord',
    to: '/',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'MANAGER', 'ANALYST', 'VIEWER'],
    end: true,
  },
  {
    label: "Appels d'offres",
    to: '/offers',
    icon: FileText,
    roles: ['ADMIN', 'MANAGER', 'ANALYST', 'VIEWER'],
  },
  {
    label: 'Acheteurs',
    to: '/buyers',
    icon: Building2,
    roles: ['ADMIN', 'MANAGER', 'ANALYST', 'VIEWER'],
  },
  {
    label: 'Notifications',
    to: '/notifications',
    icon: Bell,
    roles: ['ADMIN', 'MANAGER', 'ANALYST', 'VIEWER'],
  },
  {
    label: 'Rapports',
    to: '/reports',
    icon: BarChart2,
    roles: ['ADMIN', 'MANAGER', 'ANALYST'],
  },
  {
    label: 'Utilisateurs',
    to: '/admin/users',
    icon: Users,
    roles: ['ADMIN'],
    adminGroup: true,
  },
  {
    label: "Journal d'audit",
    to: '/admin/audit-log',
    icon: ClipboardList,
    roles: ['ADMIN'],
    adminGroup: true,
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user } = useAuth();
  const role = user?.role;

  const allowedItems = navItems.filter((item) => item.roles.includes(role));
  const mainItems = allowedItems.filter((item) => !item.adminGroup);
  const adminItems = allowedItems.filter((item) => item.adminGroup);

  const linkClass = ({ isActive }) =>
    [
      'flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-medium transition-colors duration-150',
      isActive
        ? 'bg-brand-orange text-white'
        : 'text-gray-300 hover:bg-brand-navy-light hover:text-white',
    ].join(' ');

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          'fixed top-0 left-0 z-30 h-full w-64 bg-brand-navy flex flex-col',
          'transform transition-transform duration-200 ease-in-out',
          'lg:relative lg:translate-x-0 lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-brand-navy-light">
          <img src={logo} alt="N+ONE Datacenters" className="h-8 w-auto object-contain flex-shrink-0" />
          <p className="text-gray-400 text-xs">Appels d'Offres</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {mainItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={linkClass}
              onClick={onClose}
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}

          {adminItems.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Administration
                </p>
              </div>
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={linkClass}
                  onClick={onClose}
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* User info at bottom */}
        <div className="px-4 py-4 border-t border-brand-navy-light">
          <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          <p className="text-xs text-gray-500 mt-0.5">{user?.role}</p>
        </div>
      </aside>
    </>
  );
}
