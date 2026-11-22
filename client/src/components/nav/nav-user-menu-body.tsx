import { DropdownMenuItem, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { LogOut, UserCog } from 'lucide-react';
import { Link } from 'react-router';
import { workspaceManagerDetailPath } from '@/lib/technician-settings-url';
import {
  navUserMenuItemClassName,
  navUserMenuLogoutItemClassName,
} from './nav-user-classes';

export type NavUserMenuBodyProps = {
  userId: string | undefined;
  onLogout: () => void;
};

export function NavUserMenuBody({ userId, onLogout }: NavUserMenuBodyProps) {
  return (
    <>
      {userId ? (
        <>
          <DropdownMenuItem className={navUserMenuItemClassName} asChild>
            <Link to={workspaceManagerDetailPath(userId)}>
              <UserCog className="size-3.5" aria-hidden />
              Personal
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-2 bg-border/80" />
        </>
      ) : null}
      <DropdownMenuItem className={navUserMenuLogoutItemClassName} onClick={() => onLogout()}>
        <LogOut className="size-3.5" aria-hidden />
        Log out
      </DropdownMenuItem>
    </>
  );
}
