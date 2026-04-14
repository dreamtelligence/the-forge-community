import MobileNav from './MobileNav';
import MobileTabBar from './MobileTabBar';
import Sidebar from './Sidebar';

type AppShellProps = {
  children: React.ReactNode;
  contentClassName?: string;
  containerClassName?: string;
  showGlow?: boolean;
};

export default function AppShell({
  children,
  contentClassName,
  containerClassName,
  showGlow = true,
}: AppShellProps) {
  const mainClassName =
    contentClassName ??
    'flex-1 px-4 pb-24 pt-20 sm:px-6 lg:ml-64 lg:p-12 transition-all relative overflow-hidden';
  const innerClassName = containerClassName ?? 'max-w-7xl mx-auto relative';

  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)] text-[var(--foreground)] selection:bg-[var(--accent)] selection:text-[var(--accent-foreground)] lg:flex-row">
      <MobileNav />
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <main className={mainClassName}>
        {showGlow ? (
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--accent)]/5 rounded-full blur-[120px] pointer-events-none -mr-64 -mt-64" />
        ) : null}
        <div className={innerClassName}>{children}</div>
      </main>
      <MobileTabBar />
    </div>
  );
}
