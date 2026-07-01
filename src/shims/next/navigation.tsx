// Minimal navigation hooks to emulate next/navigation in-browser.
export function usePathname() {
  if (typeof window === 'undefined') return '/';
  return window.location.pathname;
}

export function useRouter() {
  return {
    push: (to: string) => {
      if (typeof window !== 'undefined') window.location.assign(to);
    },
    replace: (to: string) => {
      if (typeof window !== 'undefined') window.location.replace(to);
    },
  };
}
