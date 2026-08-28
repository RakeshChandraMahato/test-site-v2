import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
  {
    variants: {
      variant: {
        default: 'border-foreground/20 text-foreground',
        secondary: 'border-foreground/10 text-muted-foreground',
        destructive: 'border-red-300 text-red-700 bg-red-50',
        outline: 'border-foreground/20 text-foreground',
        success: 'border-green-300 text-green-800 bg-green-50',
        warning: 'border-amber-300 text-amber-800 bg-amber-50',
        info: 'border-blue-300 text-blue-700 bg-blue-50',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
