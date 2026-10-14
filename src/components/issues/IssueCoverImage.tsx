'use client';

import { useState } from 'react';
import Image from 'next/image';

const DEFAULT_COVER = '/images/issue-cover-default.svg';

export function IssueCoverImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  const normalized = src && /^\/images\/issue-\d+-cover\.png$/i.test(src) ? DEFAULT_COVER : src || DEFAULT_COVER;
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div role="img" aria-label={alt} className={`bg-[radial-gradient(ellipse_at_center,#c7aa7244,transparent_58%),linear-gradient(145deg,#24516a,#071827)] ${className}`} />;
  }

  return <Image src={normalized} alt={alt} fill unoptimized sizes="(max-width: 767px) 100vw, 240px" className={className} onError={() => setFailed(true)} />;
}
