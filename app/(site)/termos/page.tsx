import type { Metadata } from 'next';
import { getOperation } from '@/lib/catalog/queries';

export const metadata: Metadata = { title: 'Termos de uso', alternates: { canonical: '/termos' } };

/** Texto base, sujeito à revisão do responsável pelo estabelecimento. */
export default async function TermsPage() {
  const { data } = await getOperation();
  const s = data.settings;
  return (
    <article className="mx-auto max-w-3xl space-y-5 px-4 py-12 leading-relaxed sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Termos de uso</h1>
      <p className="text-sm text-muted">Texto sujeito à revisão do responsável pelo estabelecimento.</p>
      <h2 className="font-display text-2xl font-semibold">Como funciona o pedido</h2>
      <ol className="list-decimal space-y-2 pl-6">
        <li>Você monta o carrinho e envia o pedido pelo site. O pedido fica <strong>registrado</strong>, mas ainda não está confirmado.</li>
        <li>O site abre o WhatsApp com a mensagem pronta. Você precisa tocar em <strong>Enviar</strong>.</li>
        <li>A equipe confere disponibilidade{s.deliveryEnabled ? ', taxa de entrega' : ''} e confirma o pedido pelo WhatsApp.</li>
        <li>Somente após a confirmação da equipe o pedido é considerado aceito.</li>
      </ol>
      <h2 className="font-display text-2xl font-semibold">Preços, disponibilidade e taxa de entrega</h2>
      <p>
        Os preços exibidos são conferidos novamente no momento do envio. Itens podem esgotar. A taxa de entrega é definida pela equipe conforme o
        endereço; enquanto não for confirmada, o total aparece como “a confirmar”. Se o total mudar, pediremos sua confirmação antes de seguir.
      </p>
      <h2 className="font-display text-2xl font-semibold">Pagamento</h2>
      <p>O site não realiza cobranças. O pagamento é combinado e feito diretamente com o restaurante, na forma escolhida.</p>
      <h2 className="font-display text-2xl font-semibold">Horários</h2>
      <p>
        Pedidos só são aceitos dentro do horário de funcionamento e quando o recebimento está ativo. O almoço é servido até acabar a comida e pode
        ser encerrado antes do previsto.
      </p>
      {s.cancellationPolicy ? (
        <>
          <h2 className="font-display text-2xl font-semibold">Cancelamentos</h2>
          <p className="whitespace-pre-line">{s.cancellationPolicy}</p>
        </>
      ) : null}
      <h2 className="font-display text-2xl font-semibold">Contato</h2>
      <p>
        {s.businessName} — {s.addressLine}, {s.city}/{s.state}. {s.referencePoint}. WhatsApp: +{s.whatsappNumber}.
      </p>
    </article>
  );
}
