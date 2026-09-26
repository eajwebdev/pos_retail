"use client";

import React, { useState, useEffect, FormEvent } from 'react';
import { Head, useForm, usePage, router } from '@inertiajs/react';
import { cn } from '@/lib/utils';
import { routes } from '@/routes';
import { useTheme } from 'next-themes';

// ShadCN Components
import {
  Card,
  CardHeader,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  User, Lock, Eye, EyeOff, LogIn,
  Zap, Loader2,
} from 'lucide-react';

interface DemoUser {
  id: number;
  name: string;
  username: string;
  password?: string;
  role: string;
  role_label: string;
  branch: string;
}

interface LoginProps {
  errors?: Record<string, string>;
  business_name?: string;
  logo_url?: string | null;
  is_demo?: boolean;
  demo_users?: DemoUser[];
}

interface LoginFormData {
  username: string;
  password: string;
}

export default function Login({
  errors: serverErrors,
  business_name: propBusinessName,
  logo_url: propLogoUrl,
  is_demo = false,
  demo_users = [],
}: LoginProps) {
  const { props } = usePage<{ app?: { name?: string; logo_url?: string | null } }>();
  const businessName = propBusinessName ?? props.app?.name ?? 'POS';
  const logo_url = propLogoUrl ?? props.app?.logo_url ?? null;
  const [showPassword, setShowPassword] = useState(false);
  const [loggingInUser, setLoggingInUser] = useState<string | null>(null);
  const { setTheme } = useTheme();

  const { data, setData, post, processing, reset } = useForm<LoginFormData>({
    username: '',
    password: '',
  });

  useEffect(() => {
    setTheme('light');
    return () => reset('password');
  }, [setTheme, reset]);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    post(routes.loginPost());
  };

  const handleQuickLogin = (u: DemoUser) => {
    setLoggingInUser(u.username);
    setData({
      username: u.username,
      password: u.password || 'password',
    });
    router.post(
      routes.loginPost(),
      {
        username: u.username,
        password: u.password || 'password',
      },
      {
        onFinish: () => setLoggingInUser(null),
      }
    );
  };

  // Exclude superadmin as requested; only keep admin, manager, cashier
  const quickUsers = (demo_users || []).filter((u) => u.username !== 'superadmin');
  const hasDemo = is_demo && quickUsers.length > 0;

  return (
    <>
      <Head title="Login" />

      <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4 sm:px-6 lg:px-8 py-8">
        <Card className="w-full max-w-md shadow-2xl rounded-3xl overflow-hidden border border-border bg-card">
          {/* Header */}
          <CardHeader
            style={{ marginTop: '-24px' }}
            className="text-center pt-12 pb-10 bg-[#0A1134] text-white rounded-t-3xl relative z-10 border-b border-[#151F4D]"
          >
            {/* Logo */}
            <div className="flex justify-center mb-2">
              <img
                src={logo_url ?? '/uploads/eaj-primary.png'}
                alt={businessName}
                className="h-24 w-auto max-w-[260px] object-contain drop-shadow-md"
              />
            </div>

            <CardDescription className="text-pink-200/80 text-xs font-medium tracking-wide">
              Sign in to access your retail POS & store dashboard
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 sm:px-8 pt-7 pb-8 space-y-5">
            <form onSubmit={submit} className="space-y-4">
              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-foreground text-xs font-semibold">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    value={data.username}
                    onChange={(e) => setData('username', e.target.value)}
                    className={cn(
                      'pl-10 h-11 rounded-xl text-sm focus-visible:ring-primary',
                      serverErrors?.username && 'border-destructive focus-visible:ring-destructive'
                    )}
                    autoFocus={!hasDemo}
                    disabled={processing || !!loggingInUser}
                  />
                </div>
                {serverErrors?.username && (
                  <p className="text-xs text-destructive">{serverErrors.username}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-foreground text-xs font-semibold">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={data.password}
                    onChange={(e) => setData('password', e.target.value)}
                    className={cn(
                      'pl-10 pr-11 h-11 rounded-xl text-sm focus-visible:ring-primary',
                      serverErrors?.password && 'border-destructive focus-visible:ring-destructive'
                    )}
                    disabled={processing || !!loggingInUser}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-primary/10"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={processing || !!loggingInUser}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-primary" />
                    ) : (
                      <Eye className="h-4 w-4 text-primary" />
                    )}
                  </Button>
                </div>
                {serverErrors?.password && (
                  <p className="text-xs text-destructive">{serverErrors.password}</p>
                )}
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                className="w-full h-11 font-semibold text-sm shadow-md transition-all duration-200 rounded-xl flex items-center justify-center gap-2 mt-2"
                disabled={processing || !!loggingInUser}
              >
                {processing && !loggingInUser ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            {/* Quick 1-Click Demo Login (Admin, Manager, Cashier) at bottom of Sign In */}
            {hasDemo && (
              <div className="pt-4 border-t border-border/60">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                    1-Click Demo Login
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-semibold">
                    One Branch
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {quickUsers.map((u) => {
                    const isThisLoggingIn = loggingInUser === u.username;
                    const label =
                      u.username === 'admin'
                        ? 'Admin'
                        : u.username === 'manager'
                        ? 'Manager'
                        : 'Cashier';

                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleQuickLogin(u)}
                        disabled={processing || !!loggingInUser}
                        className={cn(
                          'py-2 px-1 rounded-xl border text-xs font-semibold transition-all select-none flex flex-col items-center justify-center relative overflow-hidden',
                          isThisLoggingIn
                            ? 'border-primary bg-primary/10 text-primary shadow-xs'
                            : 'border-border/80 bg-muted/40 hover:bg-muted hover:border-primary/50 text-foreground active:scale-95'
                        )}
                        title={`1-Click login as ${label} (@${u.username})`}
                      >
                        {isThisLoggingIn ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary my-1" />
                        ) : (
                          <>
                            <span className="font-bold text-foreground text-xs leading-tight">
                              {label}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono mt-0.5">
                              @{u.username}
                            </span>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

