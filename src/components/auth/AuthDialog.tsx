import React, { useState } from 'react';
import { useStore } from '@/services/storeContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { UserRole } from '@/types/auth';
import { Shield, LogIn, LogOut, Lock, UserCheck } from 'lucide-react';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLES_INFO: Record<UserRole, { title: string; desc: string; badgeVariant: 'default' | 'secondary' | 'success' | 'destructive' | 'outline' }> = {
  owner: {
    title: 'Owner / Super Admin',
    desc: 'Full access to Financials (GP/Net Profit), rate histories, master configurations, overhead, and user security.',
    badgeVariant: 'default',
  },
  manager: {
    title: 'Operations Manager',
    desc: 'Daily operational control: Purchases, Sales, Reservations, Damage & Repairs, Customer relations.',
    badgeVariant: 'success',
  },
  staff: {
    title: 'Staff / Operator',
    desc: 'Operational execution: New Sales, Packing Sheets, Recipe details, Available stock.',
    badgeVariant: 'secondary',
  },
  viewer: {
    title: 'Viewer / Accountant',
    desc: 'Audit & verification mode: Read-only access to Sales Register, Inventory Balances, and reports with export capability.',
    badgeVariant: 'outline',
  },
};

export const AuthDialog: React.FC<AuthDialogProps> = ({ open, onOpenChange }) => {
  const { user, signIn, signOut } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn(email, password);
    setLoading(false);
    if (res.success) {
      setEmail('');
      setPassword('');
      onOpenChange(false);
    } else {
      setError(res.error || 'Invalid email or password. Please try again.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    onOpenChange(false);
  };

  const roleInfo = user ? (ROLES_INFO[user.role] || ROLES_INFO.staff) : ROLES_INFO.viewer;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-foreground" />
            <DialogTitle>Account & Security</DialogTitle>
          </div>
          <DialogDescription>
            Role-Based Access Control (RBAC) & Session Management
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-red-50 border border-red-300 text-red-700 text-xs rounded-none mb-3">
            {error}
          </div>
        )}

        {/* Current Active Account Profile */}
        {user && (
          <div className="p-4 border border-foreground/10 bg-secondary/20 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <UserCheck className="h-4 w-4 text-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <Badge variant={roleInfo.badgeVariant} className="uppercase text-[10px] tracking-wider py-0 px-2">
                {user.role}
              </Badge>
            </div>

            <div className="pt-2 border-t border-foreground/10 text-xs text-muted-foreground leading-relaxed">
              <p className="font-medium text-foreground mb-0.5">{roleInfo.title}</p>
              <p>{roleInfo.desc}</p>
            </div>
          </div>
        )}

        {/* Sign In Section */}
        <div className="pt-4 border-t border-foreground/10 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
              Switch Account / Sign In
            </h3>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">
                Email address
              </label>
              <Input
                type="email"
                required
                placeholder="user@asj.internal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1">
                Password
              </label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-xs"
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full text-xs">
              <LogIn className="h-3.5 w-3.5 mr-1.5" /> {loading ? 'Authenticating...' : 'Sign In with Password'}
            </Button>
          </form>

          <p className="text-[11px] text-muted-foreground text-center pt-1">
            New employee accounts are created manually in the database by the Administrator.
          </p>

          <div className="pt-2 border-t border-foreground/10 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" /> Log Out Current Session
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
