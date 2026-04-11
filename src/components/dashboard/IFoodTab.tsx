import { Card, CardContent } from "@/components/ui/card";

interface IFoodTabProps {
  orgId: string;
}

const IFoodTab = (_props: IFoodTabProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Integração iFood</h2>
        <p className="text-sm text-muted-foreground">Receba pedidos do iFood direto no seu dashboard.</p>
      </div>

      <Card className="border-0 overflow-hidden bg-gradient-to-br from-[#EA1D2C]/5 via-background to-[#EA1D2C]/10">
        <CardContent className="pt-6">
          <div className="text-center space-y-5 py-10">
            {/* Animated delivery illustration */}
            <div className="relative mx-auto w-32 h-32">
              {/* Floating animation wrapper */}
              <div className="animate-[float_3s_ease-in-out_infinite]">
                <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-32 h-32">
                  {/* Glow circle */}
                  <circle cx="60" cy="60" r="50" fill="url(#glowGrad)" className="animate-[pulse_3s_ease-in-out_infinite]" />

                  {/* Bag body */}
                  <rect x="38" y="40" width="44" height="38" rx="6" fill="#EA1D2C" />
                  <rect x="42" y="44" width="36" height="30" rx="4" fill="#FF4D5A" />

                  {/* Bag handle */}
                  <path d="M48 40 V32 Q48 26 54 26 H66 Q72 26 72 32 V40" stroke="#EA1D2C" strokeWidth="3.5" fill="none" strokeLinecap="round" />

                  {/* iFood-style fork icon on bag */}
                  <line x1="55" y1="50" x2="55" y2="64" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <line x1="60" y1="50" x2="60" y2="64" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <line x1="65" y1="50" x2="65" y2="64" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  <path d="M53 64 H67 Q67 70 60 70 Q53 70 53 64Z" fill="white" />

                  {/* Rocket flame at bottom */}
                  <path d="M52 78 L60 92 L68 78" fill="url(#flameGrad)" className="animate-[flicker_0.4s_ease-in-out_infinite_alternate]" />
                  <path d="M55 78 L60 88 L65 78" fill="#FFDD57" className="animate-[flicker_0.3s_ease-in-out_infinite_alternate-reverse]" />

                  {/* Speed lines */}
                  <line x1="28" y1="50" x2="18" y2="50" stroke="#EA1D2C" strokeWidth="2" strokeLinecap="round" className="animate-[dashLeft_1.2s_ease-in-out_infinite]" opacity="0.6" />
                  <line x1="30" y1="58" x2="14" y2="58" stroke="#EA1D2C" strokeWidth="2" strokeLinecap="round" className="animate-[dashLeft_1.2s_ease-in-out_0.3s_infinite]" opacity="0.4" />
                  <line x1="28" y1="66" x2="20" y2="66" stroke="#EA1D2C" strokeWidth="2" strokeLinecap="round" className="animate-[dashLeft_1.2s_ease-in-out_0.6s_infinite]" opacity="0.5" />

                  {/* Sparkles */}
                  <circle cx="90" cy="35" r="2.5" fill="#FFDD57" className="animate-[sparkle_2s_ease-in-out_infinite]" />
                  <circle cx="96" cy="50" r="1.8" fill="#EA1D2C" className="animate-[sparkle_2s_ease-in-out_0.7s_infinite]" />
                  <circle cx="88" cy="72" r="2" fill="#FFDD57" className="animate-[sparkle_2s_ease-in-out_1.4s_infinite]" />

                  <defs>
                    <radialGradient id="glowGrad" cx="0.5" cy="0.5" r="0.5">
                      <stop offset="0%" stopColor="#EA1D2C" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="#EA1D2C" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="flameGrad" x1="60" y1="78" x2="60" y2="92" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#FF6B35" />
                      <stop offset="1" stopColor="#EA1D2C" stopOpacity="0.6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Animated badge */}
            <div className="inline-flex items-center gap-2 bg-[#EA1D2C] text-white px-5 py-2 rounded-full text-sm font-bold tracking-wide animate-[pulse_2.5s_cubic-bezier(0.4,0,0.6,1)_infinite]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
              </span>
              EM BREVE
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold">Integração a caminho!</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Estamos finalizando a integração com o iFood. Em breve você poderá receber pedidos e sincronizar seu cardápio automaticamente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes flicker {
          0% { transform: scaleY(1) scaleX(1); opacity: 1; }
          100% { transform: scaleY(0.85) scaleX(0.9); opacity: 0.7; }
        }
        @keyframes dashLeft {
          0% { opacity: 0; transform: translateX(8px); }
          50% { opacity: 0.7; }
          100% { opacity: 0; transform: translateX(-8px); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
};

export default IFoodTab;
