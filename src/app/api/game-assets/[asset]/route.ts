import {gameAssetResponse} from '../../../_gameAssetDelivery';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{asset:string}>}){
 return gameAssetResponse(request,(await context.params).asset);
}
