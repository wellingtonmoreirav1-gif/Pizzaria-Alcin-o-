export type OrderStatus = 'registered' | 'customer_confirmed' | 'accepted' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
export type Fulfillment = 'delivery' | 'pickup' | 'dine_in';
export type PaymentMethod = 'pix' | 'cash' | 'credit_card' | 'debit_card' | 'on_delivery';
export type DeliveryFeeStatus = 'not_applicable' | 'pending' | 'estimated' | 'confirmed';
export type CancelReason = 'out_of_area' | 'unavailable' | 'customer_request' | 'no_customer_response' | 'duplicate' | 'other';

export const ORDER_STATUSES: OrderStatus[] = [
  'registered',
  'customer_confirmed',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
  'completed',
  'cancelled',
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  registered: 'Registrado no site',
  customer_confirmed: 'Cliente confirmou no WhatsApp',
  accepted: 'Aceito pela equipe',
  preparing: 'Em preparação',
  ready: 'Pronto',
  out_for_delivery: 'Saiu para entrega',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

/** Texto mostrado ao cliente na página de acompanhamento. */
export const ORDER_STATUS_CUSTOMER_TEXT: Record<OrderStatus, string> = {
  registered: 'Pedido registrado. Envie a mensagem no WhatsApp para a equipe confirmar.',
  customer_confirmed: 'Recebemos sua mensagem. A equipe está conferindo o pedido.',
  accepted: 'Pedido aceito pela equipe.',
  preparing: 'Seu pedido está sendo preparado.',
  ready: 'Pedido pronto.',
  out_for_delivery: 'Pedido saiu para entrega.',
  completed: 'Pedido concluído. Obrigado!',
  cancelled: 'Pedido cancelado.',
};

export const FULFILLMENT_LABEL: Record<Fulfillment, string> = {
  delivery: 'Entrega',
  pickup: 'Retirada no local',
  dine_in: 'Consumo no local',
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cash: 'Dinheiro',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  on_delivery: 'Pagamento na entrega (combinar com o entregador)',
};

export const FEE_STATUS_LABEL: Record<DeliveryFeeStatus, string> = {
  not_applicable: 'Não se aplica',
  pending: 'A confirmar',
  estimated: 'Prevista (a confirmar)',
  confirmed: 'Confirmada',
};

export const CANCEL_REASON_LABEL: Record<CancelReason, string> = {
  out_of_area: 'Fora da área de entrega',
  unavailable: 'Produto indisponível',
  customer_request: 'Pedido do cliente',
  no_customer_response: 'Cliente não respondeu',
  duplicate: 'Pedido duplicado',
  other: 'Outro motivo',
};

/** Espelho das transições permitidas no banco (public.allowed_next_statuses). */
export function allowedNextStatuses(status: OrderStatus, fulfillment: Fulfillment): OrderStatus[] {
  switch (status) {
    case 'registered':
      return ['customer_confirmed', 'accepted', 'cancelled'];
    case 'customer_confirmed':
      return ['accepted', 'cancelled'];
    case 'accepted':
      return ['preparing', 'cancelled'];
    case 'preparing':
      return ['ready', 'cancelled'];
    case 'ready':
      return fulfillment === 'delivery' ? ['out_for_delivery', 'completed', 'cancelled'] : ['completed', 'cancelled'];
    case 'out_for_delivery':
      return ['completed', 'cancelled'];
    default:
      return [];
  }
}

/** Mensagens amigáveis para erros lançados pelas funções do banco. */
export const DB_ERROR_MESSAGES: Record<string, string> = {
  not_authorized: 'Você não tem permissão para esta ação.',
  group_not_shared: 'Só grupos cadastrados em “Bordas e molhos” podem ser ligados a vários produtos.',
  order_not_found: 'Pedido não encontrado.',
  invalid_transition: 'Esta mudança de status não é permitida a partir do status atual.',
  delivery_fee_not_confirmed: 'Confirme a taxa de entrega antes de aceitar o pedido.',
  customer_approval_pending: 'O cliente ainda precisa aprovar o novo total.',
  cancel_reason_required: 'Informe o motivo do cancelamento.',
  note_too_long: 'A observação é muito longa.',
  invalid_fee: 'Taxa inválida.',
  not_a_delivery_order: 'Este pedido não é de entrega.',
  order_closed: 'O pedido já foi encerrado.',
  fee_locked: 'Somente gerente ou administrador pode alterar a taxa deste pedido.',
  note_required: 'Informe a justificativa da alteração.',
  last_admin: 'É necessário manter pelo menos um administrador.',
  user_not_found: 'Usuário não encontrado. A pessoa precisa criar a conta antes.',
  invalid_pause: 'Tempo de pausa inválido.',
  invalid_entity: 'Item inválido.',
  not_found: 'Registro não encontrado.',
};

export function friendlyDbError(error: { message?: string } | null | undefined): string {
  const key = error?.message?.split(':')[0]?.trim() ?? '';
  return DB_ERROR_MESSAGES[key] ?? 'Não foi possível concluir a operação. Tente novamente.';
}
