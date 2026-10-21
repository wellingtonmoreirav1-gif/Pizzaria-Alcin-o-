import { GroupMenuPage, groupMetadata } from '@/components/storefront/group-menu-page';

export const metadata = groupMetadata('lanches');

export default function Page() {
  return <GroupMenuPage groupKey="lanches" />;
}
