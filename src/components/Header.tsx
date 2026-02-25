import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X, User, LogOut } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/about', label: 'About' },
  { to: '/who-this-is-for', label: 'Who This Is For' },
];

const authLinks = [
  { to: '/events', label: 'Events' },
  { to: '/dashboard', label: 'Dashboard' },
];

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const navLinks = isAuthenticated ? [...publicLinks, ...authLinks] : publicLinks;

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-extrabold text-primary-foreground">SZ</span>
          </div>
          <span className="text-xl font-bold text-foreground">
            Skill<span className="text-primary">Zone</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive(link.to)
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Right */}
        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {user?.first_name?.[0] || user?.organization_name?.[0] || 'U'}
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {user?.role === 'organization' ? user.organization_name : user?.first_name}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center gap-2">
                    <User className="h-4 w-4" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="flex items-center gap-2 text-destructive">
                  <LogOut className="h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/signin">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="flex flex-col gap-6 pt-8">
              <nav className="flex flex-col gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className={`rounded-md px-4 py-3 text-sm font-medium transition-colors ${
                      isActive(link.to)
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
              <div className="border-t border-border pt-4">
                {isAuthenticated ? (
                  <div className="flex flex-col gap-2">
                    <Link
                      to="/profile"
                      onClick={() => setOpen(false)}
                      className="rounded-md px-4 py-3 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
                    >
                      Profile
                    </Link>
                    <button
                      onClick={() => { logout(); setOpen(false); }}
                      className="rounded-md px-4 py-3 text-left text-sm font-medium text-destructive hover:bg-destructive/10"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Button variant="ghost" asChild className="justify-start">
                      <Link to="/signin" onClick={() => setOpen(false)}>Sign In</Link>
                    </Button>
                    <Button asChild className="justify-start">
                      <Link to="/signup" onClick={() => setOpen(false)}>Sign Up</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
