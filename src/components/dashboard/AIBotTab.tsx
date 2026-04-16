import { Card, CardContent } from "@/components/ui/card";

interface AIBotTabProps {
  orgId: string;
}

const AIBotTab = (_props: AIBotTabProps) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Robô de Atendimento</h2>
        <p className="text-sm text-muted-foreground">
          Atendimento automático 24h por WhatsApp para sua loja.
        </p>
      </div>

      <Card className="border-0 overflow-hidden bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <CardContent className="pt-6">
          <div className="text-center space-y-5 py-10">
            {/* Animated robot */}
            <div className="relative mx-auto w-36 h-36">
              <div className="animate-[botFloat_3s_ease-in-out_infinite]">
                <svg
                  viewBox="0 0 140 140"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-36 h-36"
                >
                  {/* Soft glow */}
                  <circle cx="70" cy="70" r="58" fill="url(#botGlow)" />

                  {/* Antenna */}
                  <line
                    x1="70"
                    y1="22"
                    x2="70"
                    y2="34"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle
                    cx="70"
                    cy="20"
                    r="4"
                    fill="hsl(var(--primary))"
                    className="animate-[botPulse_1.4s_ease-in-out_infinite]"
                  />

                  {/* Head */}
                  <rect
                    x="38"
                    y="34"
                    width="64"
                    height="48"
                    rx="12"
                    fill="hsl(var(--primary))"
                  />
                  <rect
                    x="42"
                    y="38"
                    width="56"
                    height="40"
                    rx="9"
                    fill="hsl(var(--primary) / 0.85)"
                  />

                  {/* Eyes group (look around) */}
                  <g className="origin-center animate-[botLook_6s_ease-in-out_infinite]" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                    {/* Left eye */}
                    <g className="origin-center animate-[botBlink_4s_ease-in-out_infinite]" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                      <circle cx="56" cy="56" r="6" fill="white" />
                      <circle cx="56" cy="56" r="2.5" fill="hsl(var(--primary))" />
                    </g>
                    {/* Right eye */}
                    <g className="origin-center animate-[botBlink_4s_ease-in-out_infinite]" style={{ transformBox: "fill-box", transformOrigin: "center" }}>
                      <circle cx="84" cy="56" r="6" fill="white" />
                      <circle cx="84" cy="56" r="2.5" fill="hsl(var(--primary))" />
                    </g>
                  </g>

                  {/* Mouth */}
                  <path
                    d="M60 70 Q70 75 80 70"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                  />

                  {/* Neck */}
                  <rect x="64" y="82" width="12" height="6" fill="hsl(var(--primary) / 0.7)" />

                  {/* Body */}
                  <rect
                    x="34"
                    y="88"
                    width="72"
                    height="34"
                    rx="10"
                    fill="hsl(var(--primary))"
                  />
                  <rect
                    x="40"
                    y="94"
                    width="60"
                    height="22"
                    rx="6"
                    fill="hsl(var(--primary) / 0.75)"
                  />

                  {/* LEDs panel (sequential) */}
                  <circle
                    cx="56"
                    cy="105"
                    r="3"
                    fill="hsl(142 71% 45%)"
                    className="animate-[botLed_1.2s_ease-in-out_infinite]"
                  />
                  <circle
                    cx="70"
                    cy="105"
                    r="3"
                    fill="hsl(48 96% 53%)"
                    className="animate-[botLed_1.2s_ease-in-out_0.4s_infinite]"
                  />
                  <circle
                    cx="84"
                    cy="105"
                    r="3"
                    fill="hsl(217 91% 60%)"
                    className="animate-[botLed_1.2s_ease-in-out_0.8s_infinite]"
                  />

                  {/* Left arm */}
                  <g
                    className="animate-[botArmL_2.4s_ease-in-out_infinite]"
                    style={{ transformBox: "fill-box", transformOrigin: "100% 0%" }}
                  >
                    <rect x="22" y="92" width="12" height="22" rx="5" fill="hsl(var(--primary))" />
                  </g>
                  {/* Right arm */}
                  <g
                    className="animate-[botArmR_2.4s_ease-in-out_infinite]"
                    style={{ transformBox: "fill-box", transformOrigin: "0% 0%" }}
                  >
                    <rect x="106" y="92" width="12" height="22" rx="5" fill="hsl(var(--primary))" />
                  </g>

                  {/* Shadow */}
                  <ellipse
                    cx="70"
                    cy="130"
                    rx="32"
                    ry="4"
                    fill="hsl(var(--foreground) / 0.18)"
                    className="origin-center animate-[botShadow_3s_ease-in-out_infinite]"
                    style={{ transformBox: "fill-box", transformOrigin: "center" }}
                  />

                  <defs>
                    <radialGradient id="botGlow" cx="0.5" cy="0.5" r="0.5">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                    </radialGradient>
                  </defs>
                </svg>
              </div>
            </div>

            {/* Badge EM BREVE */}
            <div className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2 rounded-full text-sm font-bold tracking-wide animate-[pulse_2.5s_cubic-bezier(0.4,0,0.6,1)_infinite]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-foreground" />
              </span>
              EM BREVE
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold">Robô de Atendimento com IA</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Atendimento automático 24h via WhatsApp. Responde dúvidas dos clientes,
                mostra cardápio, anota pedidos e transfere pra você quando precisar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <style>{`
        @keyframes botFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes botPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.25); }
        }
        @keyframes botBlink {
          0%, 92%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes botLook {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2.5px); }
          75% { transform: translateX(2.5px); }
        }
        @keyframes botLed {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 1; }
        }
        @keyframes botArmL {
          0%, 100% { transform: rotate(-4deg); }
          50% { transform: rotate(4deg); }
        }
        @keyframes botArmR {
          0%, 100% { transform: rotate(4deg); }
          50% { transform: rotate(-4deg); }
        }
        @keyframes botShadow {
          0%, 100% { transform: scaleX(1); opacity: 0.3; }
          50% { transform: scaleX(0.85); opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default AIBotTab;
