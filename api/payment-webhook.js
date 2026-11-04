import {admin,json} from "../lib/_lib.js";
import {createHmac,timingSafeEqual} from "node:crypto";
export const config={api:{bodyParser:false}};
export default async function handler(req,res){
 if(req.method!=="POST")return json(res,405,{error:"Method not allowed"});
 const secret=process.env.VERIFY_ET_WEBHOOK_SECRET;if(!secret)return json(res,503,{error:"Webhook secret is not configured"});
 const chunks=[];let size=0;for await(const c of req){size+=c.length;if(size>1024*1024)return json(res,413,{error:"Webhook too large"});chunks.push(c);}const raw=Buffer.concat(chunks).toString("utf8");
 const timestamp=req.headers["x-webhook-timestamp"]||"",signature=req.headers["x-webhook-signature"]||"",sent=Date.parse(timestamp);
 if(!Number.isFinite(sent)||Math.abs(Date.now()-sent)>5*60*1000)return json(res,401,{error:"Stale webhook timestamp"});
 const expected=createHmac("sha256",secret).update(`${timestamp}.${raw}`).digest("hex");const valid=String(signature).split(",").some(part=>{const v=Buffer.from(part.trim().replace(/^sha256=/,""));const e=Buffer.from(expected);return v.length===e.length&&timingSafeEqual(v,e);});if(!valid)return json(res,401,{error:"Invalid webhook signature"});
 if(req.headers["x-webhook-test"]==="true")return res.status(204).end();
 let event;try{event=JSON.parse(raw);}catch{return json(res,400,{error:"Invalid JSON"});}if(event.event!=="verification.completed")return res.status(204).end();
 const d=event.data||{},ref=String(d.receiptNumber||d.referenceNumber||"");if(!ref)return res.status(204).end();
 const {data:items=[]}=await admin.from("payment_submissions").select("*").eq("transaction_reference",ref).eq("status","pending").order("created_at",{ascending:false}).limit(1);const item=items[0];if(!item)return res.status(204).end();
 const match=d.settlementAccountMatch;const ok=d.verified===true&&d.status==="success"&&Number(d.amount)===Number(item.amount_etb)&&d.currency==="ETB"&&match?.matched===true&&((item.method==="cbe"&&d.bank==="cbe")||(item.method==="telebirr"&&d.bank==="telebirr"));
 if(ok){const {error:ev}=await admin.from("payment_events").insert({provider:"verify.et",provider_transaction_id:String(event.id||event.requestId||ref)});if(!ev||ev.code==="23505"){await admin.from("payment_submissions").update({status:"approved",admin_note:"Automatically verified by signed Verify.ET webhook; settlement matched.",reviewed_at:new Date().toISOString()}).eq("id",item.id);await admin.from("profiles").upsert({id:item.user_id,plan:"pro",pro_until:null},{onConflict:"id"});}}
 else{await admin.from("payment_submissions").update({admin_note:"Verify.ET completed. Settlement match was not present in webhook payload or did not pass; admin review required."}).eq("id",item.id);}
 return res.status(204).end();
}
