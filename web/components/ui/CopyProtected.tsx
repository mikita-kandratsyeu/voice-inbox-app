'use client';

import type { HTMLAttributes, ReactElement, ReactNode } from 'react';

type CopyProtectedProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
};

export function CopyProtected({ children, className, ...props }: CopyProtectedProps): ReactElement {
  function blockClipboard(event: React.ClipboardEvent): void {
    event.preventDefault();
  }

  return (
    <p {...props} className={className} onCopy={blockClipboard} onCut={blockClipboard}>
      {children}
    </p>
  );
}
