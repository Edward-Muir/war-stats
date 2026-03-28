import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
  slug: string;
  chapter?: string | null;
  className?: string;
}

function chapterToSlug(chapter: string): string {
  return chapter.toLowerCase().replace(/\s+/g, '-');
}

export function FactionIcon({ slug, chapter, className }: Props) {
  const [fallback, setFallback] = useState(false);

  const src =
    chapter && chapter !== 'ADEPTUS ASTARTES' && !fallback
      ? `/icons/chapters/${chapterToSlug(chapter)}.svg`
      : `/icons/factions/${slug}.svg`;

  return (
    <img
      src={src}
      alt=""
      className={cn('h-7 w-7 dark:invert', className)}
      onError={(e) => {
        if (!fallback) {
          setFallback(true);
        } else {
          (e.target as HTMLImageElement).style.display = 'none';
        }
      }}
    />
  );
}
