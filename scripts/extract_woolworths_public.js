'use strict';
// Extract factual fields only from ordinary public HTML captures. No API requests.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const digest=raw=>crypto.createHash('sha256').update(raw).digest('hex');
function extract(raw,capture){
  if(capture.status!==200||digest(raw)!==capture.sha256)throw Error('Public response hash/status mismatch');
  const match=raw.toString().match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if(!match)throw Error('Public page has no embedded product facts');
  const page=JSON.parse(match[1]).props.pageProps,details=page.pdDetails,product=details?.Product;
  if(!product||String(product.Stockcode)!==new URL(capture.url).pathname.split('/')[3])throw Error('Product reference does not match its public page');
  const attributes=product.AdditionalAttributes||details.AdditionalAttributes||{};
  const fields=['Stockcode','Barcode','GtinFormat','Name','DisplayName','Brand','Variety','PackageSize','IsRanged','IsInStock','IsAvailable','IsPurchasable','AgeRestricted','IsTobacco','IsMarketProduct'];
  const attributeNames=['PiesProductDepartmentsjson','piesdepartmentnamesjson','piescategorynamesjson','piessubcategorynamesjson','ingredients','brand','nutritionalinformation','servingsize-total-nip','servingsperpack-total-nip'];
  return {sourceRecordId:String(product.Stockcode),provenance:{sourceId:'woolworths-au-public',trustClass:'official-au-retailer',market:'AU',url:capture.url,finalUrl:capture.finalUrl,retrievedAt:capture.retrievedAt,sha256:capture.sha256,responseBytes:capture.bytes,contentType:capture.contentType},product:Object.fromEntries(fields.map(key=>[key,product[key]??null])),attributes:Object.fromEntries(attributeNames.filter(key=>attributes[key]!=null).map(key=>[key,attributes[key]])),nutrition:details.NutritionalInformation||[],countryOfOrigin:details.CountryOfOriginLabel||null,availabilityContext:{storeSelected:false,accountUsed:false,listingState:'listed-at-retrieval',currentAvailability:'unknown',note:'Public product page evidenced. No-location stock/range flags do not establish nationwide availability or discontinuation.'}};
}
function extractDirectory(directory){
  const captures=JSON.parse(fs.readFileSync(path.join(directory,'capture-manifest.json'),'utf8'));
  return captures.filter(row=>new URL(row.url).pathname.startsWith('/shop/productdetails/')&&new URL(row.finalUrl).pathname.startsWith('/shop/productdetails/')).map(row=>extract(fs.readFileSync(path.join(directory,row.file)),row));
}
if(require.main===module){const [directory,output]=process.argv.slice(2);if(!directory||!output)throw Error('Usage: node scripts/extract_woolworths_public.js CAPTURE_DIRECTORY OUTPUT_JSON');fs.writeFileSync(output,JSON.stringify({schemaVersion:1,source:'Official Woolworths Australia public product HTML',records:extractDirectory(directory)},null,2)+'\n');}
module.exports={extract,extractDirectory};
