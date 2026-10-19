import type { Metadata } from 'next';
import { getOperation } from '@/lib/catalog/queries';

export const metadata: Metadata = { title: 'Política de privacidade', alternates: { canonical: '/privacidade' } };

/**
 * Texto base, alinhado ao funcionamento REAL do sistema. Deve ser revisado pelo
 * responsável pelo estabelecimento (e, se possível, por um advogado) antes da publicação.
 */
export default async function PrivacyPage() {
  const { data } = await getOperation();
  const s = data.settings;
  const contact = s.privacyContactEmail ? `pelo e-mail ${s.privacyContactEmail} ou` : 'pelo';
  return (
    <article className="mx-auto max-w-3xl space-y-5 px-4 py-12 leading-relaxed sm:px-6">
      <h1 className="font-display text-4xl font-semibold">Política de privacidade</h1>
      <p className="text-sm text-muted">Texto sujeito à revisão do responsável pelo estabelecimento.</p>
      <p>
        Esta política explica como a {s.businessName} (“Alcinão”) trata dados pessoais no site de pedidos, de acordo com a Lei Geral de Proteção
        de Dados (Lei nº 13.709/2018 — LGPD).
      </p>
      <h2 className="font-display text-2xl font-semibold">Quais dados coletamos e por quê</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li><strong>Nome e telefone</strong>: para identificar o pedido e falar com você pelo WhatsApp sobre ele.</li>
        <li><strong>Endereço e ponto de referência</strong> (somente entregas): para levar o pedido até você.</li>
        <li>
          <strong>Localização no mapa</strong> (opcional, somente entregas): só é obtida se você tocar em “Usar minha localização” e autorizar no
          navegador, ou marcar o ponto manualmente. É lida uma única vez, nunca em segundo plano, e serve apenas para ajudar o entregador.
        </li>
        <li><strong>Itens, valores e forma de pagamento</strong>: para preparar o pedido e manter o histórico de vendas do restaurante.</li>
        <li><strong>Conta (opcional)</strong>: e-mail, senha (armazenada de forma criptografada pelo provedor de autenticação), endereços e favoritos salvos por você.</li>
        <li><strong>Dados técnicos</strong>: um código irreversível derivado do endereço IP, usado apenas para evitar abusos, apagado em até 2 dias.</li>
      </ul>
      <h2 className="font-display text-2xl font-semibold">Bases legais</h2>
      <p>
        Execução do pedido solicitado por você (art. 7º, V), cumprimento de obrigações legais (art. 7º, II) e legítimo interesse para segurança
        e prevenção de fraudes (art. 7º, IX). A localização depende da sua ação e autorização.
      </p>
      <h2 className="font-display text-2xl font-semibold">Com quem compartilhamos</h2>
      <p>
        Os dados ficam em provedores de infraestrutura contratados para hospedar o site e o banco de dados (por exemplo, Vercel e Supabase).
        Ao enviar o pedido pelo WhatsApp, a mensagem é transmitida pelo WhatsApp (Meta), conforme os termos desse serviço. Não vendemos dados.
        O mapa usa imagens do OpenStreetMap; seu navegador baixa essas imagens diretamente.
      </p>
      <h2 className="font-display text-2xl font-semibold">Por quanto tempo guardamos</h2>
      <ul className="list-disc space-y-2 pl-6">
        <li>Coordenadas do mapa: apagadas automaticamente {data.settings ? 'após o prazo configurado pelo restaurante (padrão de 90 dias)' : ''} depois de o pedido ser encerrado.</li>
        <li>Pedidos: mantidos para controle de vendas e obrigações legais; podem ser anonimizados mediante solicitação, preservando apenas itens e valores.</li>
        <li>Conta: até você pedir a exclusão (disponível em “Minha conta”).</li>
      </ul>
      <h2 className="font-display text-2xl font-semibold">Seus direitos</h2>
      <p>
        Você pode pedir confirmação, acesso, correção, anonimização ou exclusão dos seus dados, além de informações sobre compartilhamento. Fale
        conosco {contact} WhatsApp do restaurante. Clientes com conta podem editar seus dados e excluir a conta diretamente no site.
      </p>
      <h2 className="font-display text-2xl font-semibold">Armazenamento no seu aparelho</h2>
      <p>
        O site guarda no seu navegador o carrinho, os favoritos e os links dos pedidos feitos neste aparelho, apenas para sua conveniência.
        Não usamos cookies de publicidade. Cookies de sessão são usados somente para quem entra na conta.
      </p>
    </article>
  );
}
