import React from 'react';
import { isImageBackground } from '@/lib/utils';

// Renders a "background video" field as either a looping <video> (mp4/webm/...)
// or a plain <img> (animated GIFs render fine as an <img>, but not as a <video> src).
export default function BackgroundMedia({ src, alt = '', className, videoRef, imgClassName, style }) {
  if (isImageBackground(src)) {
    return <img src={src} alt={alt} className={imgClassName || className} style={style} />;
  }
  return (
    <video
      ref={videoRef}
      src={src}
      loop
      muted
      autoPlay
      playsInline
      className={className}
      style={style}
    />
  );
}
