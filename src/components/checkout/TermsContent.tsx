const TermsContent = () => (
  <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
    <div>
      <h2 className="text-base font-semibold text-foreground mb-2">TERMOS DE USO – TRENDFOOD</h2>
      <p>
        Bem-vindo à TrendFood. Ao utilizar nossa plataforma, você concorda com as regras abaixo.
        Leia com atenção, especialmente sobre os planos anuais.
      </p>
    </div>

    <div>
      <h3 className="font-semibold text-foreground mb-1">1. O SERVIÇO</h3>
      <p>
        A TrendFood é uma plataforma de gestão de pedidos e cardápio digital (SaaS). Nós fornecemos
        a ferramenta, mas a gestão do seu negócio, entregas e recebimentos de valores são de sua
        inteira responsabilidade.
      </p>
    </div>

    <div>
      <h3 className="font-semibold text-foreground mb-1">2. PLANOS E PAGAMENTOS</h3>
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
        3. POLÍTICA DE REEMBOLSO E CANCELAMENTO (IMPORTANTE)
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
      <h3 className="font-semibold text-foreground mb-1">4. INDISPONIBILIDADE E SUPORTE</h3>
      <p>
        Trabalhamos para manter o sistema online 24h por dia. Manutenções agendadas ou
        instabilidades rápidas não geram direito a indenizações. O suporte é feito via dashboard ou
        canais oficiais.
      </p>
    </div>

    <div>
      <h3 className="font-semibold text-foreground mb-1">5. ISENÇÃO DE RESPONSABILIDADE</h3>
      <p className="mb-2">A TrendFood não se responsabiliza por:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Golpes aplicados por terceiros via Pix ou comprovantes falsos.</li>
        <li>Problemas de conexão de internet do lojista.</li>
        <li>
          Bloqueios em contas bancárias ou gateways de pagamento (Mercado Pago/Asaas).
        </li>
      </ul>
    </div>
  </div>
);

export default TermsContent;
