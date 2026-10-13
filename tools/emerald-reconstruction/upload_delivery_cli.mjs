import {parseArgs} from 'node:util';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {inspectRelease,uploadRelease,verifyRelease,vercelTransport,safeError,DeliveryError} from './upload_delivery.ts';

try {
 const {values}=parseArgs({options:{'dry-run':{type:'boolean'},'verify-only':{type:'boolean'},'env-file':{type:'string'},access:{type:'string'},'base-url':{type:'string'},release:{type:'string'},report:{type:'string'},help:{type:'boolean'}}});
 if(values.help){
  console.log('pnpm emerald:upload-assets --dry-run\npnpm emerald:upload-assets --access public|private [--env-file .env.blob.local]\npnpm emerald:upload-assets --verify-only --access public|private --base-url URL\nToken: BLOB_READ_WRITE_TOKEN in environment or ignored env file; never a CLI argument.');
 }else{
  if(values['env-file'])process.loadEnvFile(resolve(values['env-file']));
  if(values['dry-run']&&values['verify-only'])throw new DeliveryError('Choose dry-run or verify-only');
  const release=await inspectRelease(resolve(values.release??'artifacts/emerald-source/delivery'));
  const summary={sourceCommit:release.sourceCommit,releaseHash:release.releaseHash,prefix:release.prefix,resources:[...release.resources,release.manifest].map(({path,sha256,bytes,contentType})=>({path,sha256,bytes,contentType}))};
  let report;
  if(values['dry-run'])report={mode:'offline-preflight',...summary};
  else{
   const access=values.access;
   if(access!=='public'&&access!=='private')throw new DeliveryError('Specify the connected store access mode: --access public|private');
   const token=process.env.BLOB_READ_WRITE_TOKEN;
   if(!token&&(!values['verify-only']||access==='private'))throw new DeliveryError('BLOB_READ_WRITE_TOKEN is unavailable; supply it through the environment or an ignored env file.');
   const transport=vercelTransport(access,token);
   if(values['verify-only']){
    if(!values['base-url'])throw new DeliveryError('Verification requires --base-url');
    report=await verifyRelease(release,access,values['base-url'],transport);
   }else report=await uploadRelease(release,access,process.env.POKEFOLIO_ASSET_DISTRIBUTION_AUTHORIZED==='1',transport);
  }
  const output=resolve(values.report??`artifacts/emerald-source/phase-blob-upload/${values['dry-run']?'preflight':'verification'}.json`);
  await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n',{mode:0o600});
  console.log(`Verified ${summary.resources.length} manifest-listed files. Report: ${output}`);
  if(report.baseUrl){console.log(`POKEFOLIO_ASSET_BASE_URL=${report.baseUrl}`);console.log('Production: POKEFOLIO_ASSET_DISTRIBUTION_AUTHORIZED=1 only with owner authorization.');if(values.access==='private')console.log('Private store: configure server-only POKEFOLIO_ASSET_BEARER_TOKEN; upload token is not read automatically by the app.');}
  else console.log(`Offline only; no upload performed. Immutable prefix: ${release.prefix}`);
 }
}catch(error){console.error(safeError(error));process.exitCode=1;}
