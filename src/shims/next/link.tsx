import React from 'react';

type LinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

// Minimal replacement for next/link for local dev: renders a plain <a>.
export default function Link({ href, children, ...rest }: LinkProps) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
