import React, { useState } from 'react';
import { useStore } from '@/services/storeContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, LogIn, Lock, AlertCircle } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { signIn } = useStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await signIn(email.trim(), password);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Invalid credentials. Please verify your email and password.');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 animate-view-fade">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-foreground text-background mb-2">
            <span className="font-serif font-bold text-xl tracking-wider">ASJ</span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight">ASJ Unified Business</h1>
          <p className="text-sm text-muted-foreground">
            Sign in to access inventory, sales, costing & operations.
          </p>
        </div>

        {/* Login Card */}
        <div className="border border-foreground/10 bg-card p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-foreground/10">
            <Shield className="h-4 w-4 text-foreground" />
            <h2 className="text-xs uppercase tracking-wider font-semibold text-foreground">
              Secure Authentication
            </h2>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground block font-medium">
                Email Address
              </label>
              <Input
                type="email"
                required
                autoFocus
                placeholder="name@asj.internal or your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-muted-foreground block font-medium">
                Password
              </label>
              <Input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="text-sm"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full mt-2"
              size="lg"
            >
              <LogIn className="h-4 w-4 mr-2" />
              {loading ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>

          <div className="pt-4 border-t border-foreground/10 text-center">
            <p className="text-xs text-muted-foreground">
              Need access? Contact the business administrator for an account.
            </p>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3 w-3" />
          <span>Role-Based Access Control & Immutable Ledger</span>
        </div>
      </div>
    </div>
  );
};
