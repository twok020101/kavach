/** Desk mode: always light, maximum contrast, 20 px base type (see globals.css). */
export default function DeskLayout({ children }: LayoutProps<'/[locale]/desk'>) {
  return (
    <div data-mode="desk" className="min-h-dvh bg-bg text-text">
      {children}
    </div>
  );
}
