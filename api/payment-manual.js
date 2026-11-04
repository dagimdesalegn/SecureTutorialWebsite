import {admin,requireActiveUser,json} from "../lib/_lib.js";
import {randomUUID} from "node:crypto";
export const config={api:{bodyParser:false}};
export default async function handler(req,res){
 if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});
 const user=await requireActiveUser(req,res);if(!user)return;
 // Vercel's built-in body parser is disabled for multipart. Use a small bounded parser.
 const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>6*1024*1024)return json(res,413,{error:"Upload exceeds 5 MB"});chunks.push(chunk);}
 const buf=Buffer.concat(chunks),ct=req.headers["content-type"]||"",boundary=ct.split("boundary=")[1];if(!boundary)return json(res,400,{error:"Multipart upload required"});
 const parts=buf.toString("binary").split("--"+boundary);const fields={};let file=null;
 for(const p of parts){const ix=p.indexOf("\r\n\r\n");if(ix<0)continue;const head=p.slice(0,ix),body=p.slice(ix+4).replace(/\r\n$/,"");const name=head.match(/name="([^"]+)"/)?.[1];if(!name)continue;const filename=head.match(/filename="([^"]*)"/)?.[1];if(filename){const type=head.match(/Content-Type:\s*([^\r\n]+)/i)?.[1]||"";file={filename,type,buffer:Buffer.from(body,"binary")};}else fields[name]=body.trim();}
 if(!file||!["image/jpeg","image/png","application/pdf"].includes(file.type)||file.buffer.length>5*1024*1024)return json(res,400,{error:"Attach a JPG, PNG, or PDF receipt up to 5 MB"});
 if(!["telebirr","cbe"].includes(fields.method))return json(res,400,{error:"Invalid payment method"});
 const {data:settings}=await admin.from("site_settings").select("pro_price_etb").eq("id",true).single();
 const ext=file.type==="image/jpeg"?"jpg":file.type==="image/png"?"png":"pdf",path=`${user.id}/${randomUUID()}.${ext}`;
 const {error:up}=await admin.storage.from("payment-proofs").upload(path,file.buffer,{contentType:file.type,upsert:false});
 if(up)return json(res,500,{error:"Could not securely upload receipt"});
 const {error}=await admin.from("payment_submissions").insert({user_id:user.id,method:fields.method,amount_etb:settings.pro_price_etb,transaction_reference:(fields.transaction_reference||"").slice(0,120),proof_path:path});
 if(error){await admin.storage.from("payment-proofs").remove([path]);return json(res,500,{error:"Could not submit payment"});}
 return json(res,201,{ok:true});
}
