import {notFound} from 'next/navigation';
import {EmeraldClient} from './EmeraldClient';
export const dynamic='force-dynamic';
export const metadata={title:'Local source reconstruction',robots:{index:false,follow:false}};
export default function EmeraldPage(){
 if(process.env.NODE_ENV!=='development'||process.env.EMERALD_LOCAL!=='1')notFound();
 return <EmeraldClient/>;
}
