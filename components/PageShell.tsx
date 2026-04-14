import AppShell from './AppShell';

type PageShellProps = {
  children: React.ReactNode;
  contentClassName?: string;
  containerClassName?: string;
  showGlow?: boolean;
};

export default function PageShell({
  children,
  contentClassName,
  containerClassName,
  showGlow,
}: PageShellProps) {
  return (
    <AppShell
      contentClassName={contentClassName}
      containerClassName={containerClassName}
      showGlow={showGlow}
    >
      {children}
    </AppShell>
  );
}
