import { GroupMenuPage, groupMetadata } from '@/components/storefront/group-menu-page';

export const metadata = groupMetadata('pizzas');

export default function Page() {
  return <GroupMenuPage groupKey="pizzas" />;
}
