import { GroupMenuPage, groupMetadata } from '@/components/storefront/group-menu-page';

export const metadata = groupMetadata('petiscos');

export default function Page() {
  return <GroupMenuPage groupKey="petiscos" />;
}
