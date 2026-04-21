const TermsContent = () => (
  <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
    <div>
      <h2 className="text-base font-semibold text-foreground mb-2">TERMOS DE USO – TRENDFOOD</h2>
      <p>
        Bem-vindo à TrendFood. Ao utilizar nossa plataforma, você concorda com as regras abaixo.
        Leia com atenção, especialmente sobre a natureza do serviço, planos anuais e responsabilidades.
      </p>
    </div>

    <div>
      <h3 className="font-semibold text-foreground mb-1">1. NATUREZA DO SERVIÇO</h3>
      <p className="mb-2">
        A TrendFood é uma plataforma de software como serviço (SaaS) para gestão de pedidos
        e cardápio digital. A TrendFood <strong>não é</strong> um marketplace, gateway de
        pagamento, adquirente ou processadora de pagamentos.
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          <strong>Não retemos valores:</strong> todas as transações de venda (Pix, dinheiro,
          cartão de crédito ou débito) são recebidas diretamente pelo lojista, em suas próprias
          contas e maquininhas. A TrendFood não intermedia, custodia ou transita nenhum valor
          das vendas realizadas.
        </li>
        <li>
          <strong>Não processamos pagamentos:</strong> o Pix exibido no sistema é a chave do
          próprio lojista; as maquininhas de cartão são do próprio lojista. A TrendFood apenas
          facilita a exibição desses meios de pagamento no fluxo do pedido.
        </li>
        <li>
          <strong>Não somos responsáveis por contabilidade ou impostos:</strong> a gestão do
          negócio, entregas, recebimentos de valores, emissão de notas fiscais, declarações
          tributárias e obrigações contábeis são de inteira responsabilidade do lojista.
        </li>
      </ul>
    </div>

    <div>
      <h3 className="font-semibold text-foreground mb-1">2. RESPONSABILIDADE FISCAL</h3>
      <p>
        O TrendFood fornece dados de faturamento baseados nos pedidos realizados. A classificação
        fiscal do estabelecimento (CPF, MEI, ME, etc.) e o cumprimento de seus respectivos limites
        de faturamento são de <strong>responsabilidade exclusiva</strong> do usuário contratante.
        A TrendFood não presta consultoria fiscal, contábil ou jurídica.
      </p>
    </div>

    <div>
      <h3 className="font-semibold text-foreground mb-1">3. PLANOS E PAGAMENTOS</h3>
      <p className="mb-2">
        <strong>Plano Mensal:</strong> Cobrança recorrente a cada 30 dias. Pode ser cancelado a
        qualquer momento, interrompendo a próxima cobrança.
      </p>
      <p>
        <strong>Plano Anual (Com Desconto):</strong> Ao escolher o plano anual, você recebe um
        desconto de aproximadamente 17% (equivalente a 2 meses grátis). Este é um compromisso de
        fidelidade por 12 meses.
      </p>
    </div>

    <div>
      <h3 className="font-semibold text-foreground mb-1">
        4. POLÍTICA DE REEMBOLSO E CANCELAMENTO (IMPORTANTE)
      </h3>
      <p className="mb-2">
        <strong>Arrependimento (7 dias):</strong> Conforme o Código de Defesa do Consumidor, você
        tem 7 dias após a assinatura para desistir e receber 100% do valor de volta.
      </p>
      <p className="mb-2">
        <strong>Cancelamento de Plano Anual após os 7 dias:</strong> Caso o CLIENTE deseje cancelar
        o plano anual antes do fim dos 12 meses, será aplicada a seguinte regra de proteção ao
        sistema:
      </p>
      <ul className="list-disc pl-5 space-y-1">
        <li>
          O valor dos meses já utilizados será recalculado com base no preço cheio do Plano Mensal
          (sem o desconto de 17%).
        </li>
        <li>
          Sobre o saldo restante, será aplicada uma Multa Administrativa de 20% para cobrir taxas
          operacionais e custos de transação.
        </li>
        <li>O valor líquido restante será devolvido ao lojista.</li>
      </ul>
    </div>

    <div>
      <h3 className="font-semibold text-foreground mb-1">5. INDISPONIBILIDADE E SUPORTE</h3>
      <p>
        Trabalhamos para manter o sistema online 24h por dia. Manutenções agendadas ou
        instabilidades rápidas não geram direito a indenizações. O suporte é feito via dashboard ou
        canais oficiais.
      </p>
    </div>

    <div>
      <h3 className="font-semibold text-foreground mb-1">6. ISENÇÃO DE RESPONSABILIDADE</h3>
      <p className="mb-2">A TrendFood não se responsabiliza por:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Golpes aplicados por terceiros via Pix ou comprovantes falsos.</li>
        <li>Problemas de conexão de internet do lojista.</li>
        <li>
          Bloqueios em contas bancárias ou gateways de pagamento (Mercado Pago/Asaas).
        </li>
        <li>
          Perdas financeiras decorrentes de erros na gestão fiscal, contábil ou tributária
          do lojista.
        </li>
      </ul>
    </div>

    <div>
      <h3 className="font-semibold text-foreground mb-1">7. DADOS PESSOAIS E LGPD</h3>
      <p>
        A TrendFood trata os dados pessoais conforme a Lei Geral de Proteção de Dados
        (Lei nº 13.709/2018). Consulte nossa{" "}
        <a href="/privacidade" className="text-primary hover:underline">
          Política de Privacidade
        </a>{" "}
        para detalhes sobre coleta, uso e seus direitos como titular.
      </p>
    </div>

    <div className="border-t border-border pt-4 mt-4 text-xs text-muted-foreground/70">
      <p>CNPJ 66.067.207/0001-91</p>
    </div>
  </div>
);

export default TermsContent;
