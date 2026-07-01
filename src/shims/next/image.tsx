import React from 'react';

type ImgProps = React.ImgHTMLAttributes<HTMLImageElement> & { width?: number; height?: number };

// Minimal replacement for next/image for local dev: renders a plain <img> and forwards size props.
export default function Image(props: ImgProps) {
  const { width, height, style, ...rest } = props;
  const s = {
    ...(style || {}),
    width: width ? width : undefined,
    height: height ? height : undefined,
  } as React.CSSProperties;
  return <img {...rest} style={s} />;
}
