import { Profile } from '../_components/Profile';
import { RequireAccount } from '../_components/RequireAccount';

export default function Page() { return <RequireAccount><div className="studio-page"><Profile/></div></RequireAccount>; }
