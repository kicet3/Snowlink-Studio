import { Settings } from '../_components/Settings';
import { RequireAccount } from '../_components/RequireAccount';

export default function Page() {
  return <RequireAccount><Settings active={true}/></RequireAccount>;
}
