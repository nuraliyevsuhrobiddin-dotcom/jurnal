'use client';

import { useState } from 'react';
import Image from 'next/image';

const DEFAULT_COVER = '/images/issue-cover-default.svg';

export function IssueCoverImage({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  const normalized = src && /^\/images\/issue-\d+-cover\.png$/i.test(src) ? DEFAULT_COVER : src || DEFAULT_COVER;
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <div role="img" aria-label={alt} className={`absolute inset-0 bg-navy-900 flex items-center justify-center p-5 text-white font-serif text-xl ${className}`}>AGM<br />JOURNAL</div>;
  }

  return <Image src={normalized} alt={alt} fill unoptimized sizes="(max-width: 767px) 100vw, 240px" className={className} onError={() => setFailed(true)} />;
}
