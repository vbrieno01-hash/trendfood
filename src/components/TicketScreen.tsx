import { Link } from "react-router-dom";

type Props = {
  code: string;
  tag: string;
  cliente?: string;
  pedido?: string;
  status?: string;
  obs: string;
  cta: string;
  onClick?: () => void;
  disabled?: boolean;
  secondaryHref?: string;
  secondaryLabel?: string;
};

/**
 * TicketScreen — tela de estado renderizada como uma comanda térmica de cozinha.
 * Compartilhada entre RouteFallback (sinal fraco), erro de rede e 404 de loja.
 * Visual: papel kraft, mono, serrilhado, carimbo. Nada de glass/gradient.
 */
const TicketScreen = ({
  code,
  tag,
  cliente = "você",
  pedido = "abrir a loja",
  status = "sinal fraco",
  obs,
  cta,
  onClick,
  disabled,
  secondaryHref,
  secondaryLabel,
}: Props) => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ticket = `#${String(Math.floor(Math.random() * 9000) + 1000)}`;

  return (
    <div
      aria-live="polite"
      className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-10 bg-[#ece7df] text-[#111]"
      style={{ fontFamily: "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace" }}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35] mix-blend-multiply pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(rgba(0,0,0,0.18) 1px, transparent 1px), radial-gradient(rgba(0,0,0,0.10) 1px, transparent 1px)",
          backgroundSize: "3px 3px, 7px 7px",
          backgroundPosition: "0 0, 1px 2px",
        }}
      />

      <div className="relative w-full max-w-[340px]">
        <div
          aria-hidden
          className="h-3 w-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at 6px 0, transparent 5px, #fdfaf3 5.5px)",
            backgroundSize: "12px 12px",
            backgroundPosition: "0 -6px",
            backgroundRepeat: "repeat-x",
          }}
        />

        <div className="relative bg-[#fdfaf3] px-6 pt-5 pb-6 shadow-[6px_8px_0_rgba(0,0,0,0.85)]">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em]">
            <span>TRENDFOOD · POS</span>
            <span>
              {hh}:{mm}
            </span>
          </div>
          <div className="mt-1 border-t border-dashed border-black/40" />

          <div className="mt-5 leading-[0.82]">
            <div className="text-[72px] sm:text-[88px] font-black tracking-[-0.06em] text-black">
              {code}
              <span className="text-[#e85d3a]">·</span>
            </div>
          </div>

          <div className="mt-4 inline-flex items-center gap-2 bg-black text-[#fdfaf3] px-2 py-1 text-[10px] tracking-[0.22em] uppercase font-bold">
            <span className="inline-block h-1.5 w-1.5 bg-[#e85d3a] animate-pulse" />
            {tag}
          </div>

          <dl className="mt-5 space-y-2 text-[12px] leading-snug">
            <div className="flex justify-between gap-3">
              <dt className="text-black/70">Cliente</dt>
              <dd className="text-right text-black truncate">{cliente}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-black/70">Pedido</dt>
              <dd className="text-right text-black uppercase truncate max-w-[200px]">
                {pedido}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-black/70">Status</dt>
              <dd className="text-right">
                <span className="bg-[#e85d3a]/15 text-[#a8401f] px-1.5 py-0.5 uppercase tracking-wider text-[10px] font-bold">
                  {status}
                </span>
              </dd>
            </div>
          </dl>

          <div className="my-5 border-t border-dashed border-black/40" />

          <p className="text-[12.5px] leading-relaxed text-black">
            <span className="font-bold">Obs do garçom:</span> {obs}
          </p>

          <button
            onClick={onClick}
            disabled={disabled}
            className="group mt-5 w-full bg-black text-[#fdfaf3] py-3.5 text-[12px] uppercase tracking-[0.22em] font-bold flex items-center justify-between px-4 hover:bg-[#e85d3a] active:translate-y-[1px] transition-colors disabled:opacity-60 disabled:hover:bg-black"
          >
            <span className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 bg-[#e85d3a] group-hover:bg-black" />
              {cta}
            </span>
            <span className="opacity-70 group-hover:opacity-100">↻</span>
          </button>

          {secondaryHref && secondaryLabel && (
            <Link
              to={secondaryHref}
              className="mt-2 block text-center text-[11px] uppercase tracking-[0.22em] text-black/70 underline underline-offset-4 hover:text-black"
            >
              {secondaryLabel}
            </Link>
          )}

          <div className="mt-5 flex items-center justify-between text-[9px] uppercase tracking-[0.25em] text-black/60">
            <span>cx 01 · op trendfood</span>
            <span>{ticket}</span>
          </div>

          <div aria-hidden className="mt-4 flex h-10 items-end gap-[2px]">
            {Array.from({ length: 48 }).map((_, i) => (
              <span
                key={i}
                className="bg-black"
                style={{
                  width: (i % 5 === 0 ? 3 : i % 3 === 0 ? 2 : 1) + "px",
                  height: "100%",
                  opacity: i % 7 === 0 ? 0.4 : 1,
                }}
              />
            ))}
          </div>
          <div className="mt-2 text-center text-[9px] tracking-[0.4em] uppercase text-black/70">
            obrigado · volte sempre
          </div>
        </div>

        <div
          aria-hidden
          className="h-3 w-full"
          style={{
            backgroundImage:
              "radial-gradient(circle at 6px 12px, transparent 5px, #fdfaf3 5.5px)",
            backgroundSize: "12px 12px",
            backgroundRepeat: "repeat-x",
          }}
        />

        <p className="mt-6 text-center text-[9px] uppercase tracking-[0.5em] text-black/50">
          impresso por trendfood
        </p>
      </div>
    </div>
  );
};

export default TicketScreen;