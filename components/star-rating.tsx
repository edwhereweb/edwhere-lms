'use client';

import { Star } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  max?: number;
}

export function StarRating({ value, onChange, disabled, max = 5 }: StarRatingProps) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: max }).map((_, i) => {
        const ratingValue = i + 1;
        return (
          <button
            key={ratingValue}
            type="button"
            disabled={disabled}
            className={cn(
              'transition-all focus:outline-none',
              disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'
            )}
            onClick={() => onChange(ratingValue)}
            onMouseEnter={() => !disabled && setHover(ratingValue)}
            onMouseLeave={() => !disabled && setHover(0)}
          >
            <Star
              className={cn(
                'h-6 w-6',
                (hover || value) >= ratingValue
                  ? 'fill-amber-400 text-amber-400'
                  : 'text-muted-foreground fill-none'
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
