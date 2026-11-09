import type { Metadata } from 'next';
export const metadata: Metadata = {title:'Hamthel Smart Living',description:'Smart locks and home security for Nigerian homes.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
