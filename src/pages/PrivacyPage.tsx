import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import logoIcon from "@/assets/logo-icon.png";

const PrivacyPage = () => {
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground text-sm mb-10">Última atualização: fevereiro de 2025</p>

        <div className="prose prose-sm max-w-none text-foreground/90 space-y-6 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-8 [&_h2]:mb-3 [&_p]:leading-relaxed [&_p]:text-muted-foreground">
          <h2>1. Dados Coletados</h2>
          <p>A TrendFood coleta os seguintes dados pessoais: (a) <strong>Dados de cadastro:</strong> nome, e-mail e informações do estabelecimento; (b) <strong>Dados de uso:</strong> interações com a plataforma, funcionalidades utilizadas, horários de acesso e dispositivos; (c) <strong>Dados de transação:</strong> informações sobre pedidos, pagamentos e faturamento processados pela plataforma; (d) <strong>Cookies e dados técnicos:</strong> endereço IP, tipo de navegador, sistema operacional e dados de navegação.</p>

          <h2>2. Finalidade do Tratamento</h2>
          <p>Seus dados são tratados com as seguintes finalidades, conforme a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018): (a) execução do contrato de prestação de serviço; (b) melhoria e personalização da experiência na plataforma; (c) envio de comunicações sobre o serviço, atualizações e novidades; (d) cumprimento de obrigações legais e regulatórias; (e) análises estatísticas e de desempenho da plataforma; (f) prevenção de fraudes e segurança da informação.</p>

          <h2>3. Compartilhamento com Terceiros</h2>
          <p>A TrendFood não vende, aluga ou comercializa seus dados pessoais. Podemos compartilhar dados com: (a) prestadores de serviços essenciais (hospedagem, processamento de pagamentos, envio de e-mails); (b) autoridades competentes, quando exigido por lei ou ordem judicial; (c) parceiros de negócio, sempre de forma anonimizada para fins estatísticos. Todos os terceiros com acesso a dados estão sujeitos a obrigações contratuais de confidencialidade.</p>

          <h2>4. Armazenamento e Segurança</h2>
          <p>Os dados são armazenados em servidores seguros com criptografia em trânsito e em repouso. Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados contra acesso não autorizado, perda, alteração ou destruição. Os dados são retidos pelo tempo necessário para cumprir as finalidades descritas nesta política ou conforme exigido por lei.</p>

          <h2>5. Direitos do Titular</h2>
          <p>Conforme a LGPD, você tem direito a: (a) confirmar a existência de tratamento de seus dados; (b) acessar seus dados pessoais; (c) corrigir dados incompletos, inexatos ou desatualizados; (d) solicitar a anonimização, bloqueio ou eliminação de dados desnecessários; (e) solicitar a portabilidade dos dados; (f) revogar o consentimento a qualquer momento; (g) obter informações sobre compartilhamento de dados. Para exercer seus direitos, entre em contato pelo e-mail indicado ao final desta política.</p>

          <h2>6. Cookies e Tecnologias Similares</h2>
          <p>Utilizamos cookies e tecnologias similares para: (a) manter sua sessão ativa na plataforma; (b) lembrar suas preferências e configurações; (c) analisar o uso da plataforma para melhorias. Você pode configurar seu navegador para recusar cookies, porém isso pode afetar algumas funcionalidades da plataforma.</p>

          <h2>7. Encarregado de Proteção de Dados (DPO)</h2>
          <p>A TrendFood designou um Encarregado de Proteção de Dados (DPO) responsável por atender questões relacionadas ao tratamento de dados pessoais. O contato do encarregado é: <a href="mailto:privacidade@trendfood.com.br" className="text-primary hover:underline">privacidade@trendfood.com.br</a>.</p>

          <h2>8. Alterações nesta Política</h2>
          <p>Esta Política de Privacidade pode ser atualizada periodicamente para refletir mudanças em nossas práticas ou na legislação aplicável. As alterações serão publicadas nesta página com a data de atualização revisada. Recomendamos que você consulte esta página regularmente.</p>

          <h2>9. Contato</h2>
          <p>Para dúvidas, solicitações ou reclamações sobre o tratamento de seus dados pessoais, entre em contato pelo e-mail <a href="mailto:privacidade@trendfood.com.br" className="text-primary hover:underline">privacidade@trendfood.com.br</a> ou pelo e-mail geral <a href="mailto:contato@trendfood.com.br" className="text-primary hover:underline">contato@trendfood.com.br</a>.</p>
        </div>
      </main>

      <footer className="border-t border-border py-6 text-center text-muted-foreground text-sm">
        <p>© 2025 TrendFood. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default PrivacyPage;
