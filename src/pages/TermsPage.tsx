import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoIcon from "@/assets/logo-icon.png";

const TermsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoIcon} alt="TrendFood" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-bold text-foreground text-lg tracking-tight">TrendFood</span>
          </Link>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-foreground mb-2">Termos de Uso</h1>
        <p className="text-muted-foreground text-sm mb-10">Última atualização: fevereiro de 2025</p>

        <div className="prose prose-sm max-w-none text-foreground/90 space-y-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:leading-relaxed [&_p]:text-muted-foreground">
          <h2>1. Aceitação dos Termos</h2>
          <p>Ao acessar ou utilizar a plataforma TrendFood, você concorda com estes Termos de Uso. Caso não concorde com qualquer disposição, solicitamos que não utilize nossos serviços. O uso continuado da plataforma constitui aceitação integral destes termos.</p>

          <h2>2. Descrição do Serviço</h2>
          <p>A TrendFood é uma plataforma de gestão para estabelecimentos do setor de alimentação (food service). Oferecemos funcionalidades como catálogo digital, pedidos via QR Code, painel de produção (KDS), controle de caixa, gestão de motoboys, cupons de desconto e relatórios de faturamento. O serviço é disponibilizado como Software as a Service (SaaS) via navegador web.</p>

          <h2>3. Cadastro e Conta</h2>
          <p>Para utilizar a plataforma, é necessário criar uma conta fornecendo informações verdadeiras e atualizadas. Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as atividades realizadas em sua conta. Caso tome conhecimento de qualquer uso não autorizado, notifique-nos imediatamente.</p>

          <h2>4. Responsabilidades do Usuário</h2>
          <p>O usuário se compromete a: (a) utilizar a plataforma de acordo com a legislação vigente; (b) não utilizar o serviço para fins ilegais ou não autorizados; (c) manter seus dados cadastrais atualizados; (d) não tentar acessar áreas restritas do sistema ou interferir no funcionamento da plataforma; (e) ser responsável pelo conteúdo inserido na plataforma, incluindo cardápio, preços e informações do estabelecimento.</p>

          <h2>5. Planos e Pagamentos</h2>
          <p>A TrendFood oferece diferentes planos de assinatura, incluindo um plano gratuito com funcionalidades limitadas. Os planos pagos são cobrados de acordo com a periodicidade escolhida. Os valores podem ser alterados mediante aviso prévio de 30 dias. O não pagamento pode resultar na suspensão ou rebaixamento do plano. Não há cobrança de comissão sobre as vendas realizadas pelo estabelecimento.</p>

          <h2>6. Propriedade Intelectual</h2>
          <p>Todo o conteúdo da plataforma TrendFood, incluindo marca, logotipo, software, design, textos e funcionalidades, é de propriedade exclusiva da TrendFood ou de seus licenciadores. O usuário mantém a propriedade sobre o conteúdo que inserir na plataforma (cardápio, imagens, etc.).</p>

          <h2>7. Limitação de Responsabilidade</h2>
          <p>A TrendFood não se responsabiliza por: (a) interrupções temporárias no serviço por manutenção ou fatores fora de nosso controle; (b) perdas ou danos decorrentes do uso ou impossibilidade de uso da plataforma; (c) transações comerciais realizadas entre o estabelecimento e seus clientes; (d) conteúdo inserido pelos usuários na plataforma. A responsabilidade total da TrendFood está limitada ao valor pago pelo usuário nos últimos 12 meses.</p>

          <h2>8. Rescisão e Cancelamento</h2>
          <p>O usuário pode cancelar sua conta a qualquer momento. A TrendFood pode suspender ou encerrar o acesso em caso de violação destes termos, mediante notificação prévia quando possível. Em caso de cancelamento, os dados do usuário serão mantidos por 30 dias, podendo ser excluídos após esse período.</p>

          <h2>9. Alterações nos Termos</h2>
          <p>Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. As alterações serão comunicadas por meio da plataforma ou por e-mail. O uso continuado da plataforma após a publicação das alterações constitui aceitação dos novos termos.</p>

          <h2>10. Foro e Legislação Aplicável</h2>
          <p>Estes Termos de Uso são regidos pela legislação da República Federativa do Brasil. Fica eleito o foro da comarca da sede da TrendFood para dirimir quaisquer controvérsias decorrentes destes termos, com renúncia a qualquer outro, por mais privilegiado que seja.</p>

          <h2>11. Contato</h2>
          <p>Para dúvidas sobre estes Termos de Uso, entre em contato pelo e-mail <a href="mailto:contato@trendfood.com.br" className="text-primary hover:underline">contato@trendfood.com.br</a>.</p>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-muted-foreground text-sm">
        <p>© 2025 TrendFood. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default TermsPage;
