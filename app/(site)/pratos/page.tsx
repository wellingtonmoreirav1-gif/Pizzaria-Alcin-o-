import { GroupMenuPage, groupMetadata } from '@/components/storefront/group-menu-page';

export const metadata = groupMetadata('pratos');

export default function Page() {
  return <GroupMenuPage groupKey="pratos" />;
}
