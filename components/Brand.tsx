import Link from "next/link";

/** SL Strength logo mark + wordmark. */
export function Brand({
  href = "/",
  compact = false,
}: {
  href?: string;
  compact?: boolean;
}) {
  return (
    <Link href={href} className="group flex items-center gap-2.5">
      <span className="relative grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-blood-500 to-blood-700 shadow-glow">
        <span className="text-sm font-black tracking-tight text-white">SL</span>
        <span className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20" />
      </span>
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-sm font-bold uppercase tracking-[0.18em] text-white">
            SL Strength
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-blood-500">
            Operating System
          </span>
        </span>
      )}
    </Link>
  );
}
