import { nav } from '../../lib/nav';
import { NavSidebarClient } from './NavSidebarClient';

interface NavSidebarProps {
  currentPath: string;
}

export function NavSidebar({ currentPath }: NavSidebarProps) {
  return <NavSidebarClient sections={nav} currentPath={currentPath} />;
}
