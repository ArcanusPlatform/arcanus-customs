declare module 'next/image' {
  import * as React from 'react';
  const Image: React.FC<
    React.ImgHTMLAttributes<HTMLImageElement> & {
      width?: number | string;
      height?: number | string;
      priority?: boolean;
    }
  >;
  export default Image;
}

declare module 'next/link' {
  import * as React from 'react';
  const Link: React.FC<
    React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      legacyBehavior?: boolean;
      href?: string | URL;
    }
  >;
  export default Link;
}

declare module 'next/navigation' {
  export function useRouter(): {
    push: (path: string) => void;
  };
  export function usePathname(): string;
}
