import {admin,requireActiveUser,json,method} from "../lib/_lib.js";
import {createHash} from "node:crypto";
async function applyVerified(userId,methodName,reference,result,price){
 const item=Array.isArray(result?.data)?result.data[0]:result?.data;
 const match=item?.settlementAccountMatch;
 const ok=!!(item?.verified===true&&item?.status==="success"&&Number(item?.amount)===Number(price)&&item?.currency==="ETB"&&match?.matched===true);
 if(!ok)return {approved:false,reason:"Verification did not confirm the expected amount and settlement account. Manual review is required."};
 const providerId=String(item.receiptNumber||item.referenceNumber||reference);
 const {error:ev}=await admin.from("payment_events").insert({provider:"verify.et",provider_transaction_id:providerId});
 if(ev&&ev.code!=="23505")throw new Error("Could not record payment verification");
 if(ev?.code==="23505")return {approved:true,duplicate:true};
 const {error}=await admin.from("payment_submissions").update({status:"approved",admin_note:"Automatically verified by Verify.ET; settlement account matched.",reviewed_at:new Date().toISOString()}).eq("user_id",userId).eq("transaction_reference",reference).eq("status","pending");
 if(error)throw new Error("Verified payment but could not save the payment record");
 const {error:pe}=await admin.from("profiles").upsert({id:userId,plan:"pro",pro_until:null},{onConflict:"id"});if(pe)throw new Error("Payment verified but Pro access update failed");
 return {approved:true};
}
export default async function handler(req,res){
 const user=await requireActiveUser(req,res);if(!user)return;if(!method(req,res,"POST"))return;
 const {method:bank,action="instructions",transaction_reference,settlement_account,request_id,suffix}=req.body||{};
 if(!["telebirr","cbe"].includes(bank))return json(res,400,{error:"Choose Telebirr or CBE"});
 const {data:settings}=await admin.from("site_settings").select("pro_price_etb,payment_instructions").eq("id",true).single();const instructions=settings?.payment_instructions||{};
 if(action==="status"){
  if(!request_id||!/^[0-9a-f-]{36}$/i.test(request_id))return json(res,400,{error:"Invalid verification request"});
  if(!process.env.VERIFY_ET_API_KEY)return json(res,503,{error:"Verify.ET API key is not configured"});
  const r=await fetch(`https://verify.et/api/verify/${encodeURIComponent(request_id)}`,{headers:{"x-api-key":process.env.VERIFY_ET_API_KEY}});const d=await r.json().catch(()=>({}));if(!r.ok)return json(res,r.status,{error:d.message||"Could not check verification status"});return json(res,200,{verification:d.data||d});
 }
 if(action!=="verify")return json(res,200,{mode:"verify-et",amount_etb:settings.pro_price_etb,instructions:instructions[bank]||"",settlement_account:instructions[bank+"_settlement"]||""});
 const reference=String(transaction_reference||"").trim();if(reference.length<5||reference.length>200)return json(res,400,{error:"Enter a valid bank transaction or receipt reference"});
 if(!process.env.VERIFY_ET_API_KEY)return json(res,503,{error:"Add VERIFY_ET_API_KEY in Vercel environment variables"});
 const expected=String(settlement_account||instructions[bank+"_settlement"]||"").trim();if(!expected)return json(res,400,{error:"The admin has not configured the settlement account for this payment method yet"});
 const {data:existing}=await admin.from("payment_submissions").select("id").eq("user_id",user.id).eq("transaction_reference",reference).eq("status","pending").maybeSingle();if(existing)return json(res,409,{error:"This reference is already awaiting review or verification. Please wait or contact support."});
 const idempotencyKey=`p30-${createHash("sha256").update(`${user.id}|${bank}|${reference}`).digest("hex")}`;
 const {error:pendingErr}=await admin.from("payment_submissions").insert({user_id:user.id,method:bank,amount_etb:settings.pro_price_etb,transaction_reference:reference,proof_path:null,status:"pending",admin_note:"Verify.ET check submitted; awaiting result."});if(pendingErr)return json(res,500,{error:"Could not create payment verification record"});
 try{
  const r=await fetch("https://verify.et/api/verify?waitMs=5000",{method:"POST",headers:{"Content-Type":"application/json","x-api-key":process.env.VERIFY_ET_API_KEY,"Idempotency-Key":idempotencyKey},body:JSON.stringify({bank,reference,settlementAccount:expected,...(suffix?{suffix:String(suffix).replace(/\D/g,"").slice(0,8)}:{})})});
  const d=await r.json().catch(()=>({}));if(!r.ok&&r.status!==202){const message=d.message||d.error?.message||"Verify.ET could not verify this transaction";await admin.from("payment_submissions").update({status:"rejected",admin_note:message,reviewed_at:new Date().toISOString()}).eq("user_id",user.id).eq("transaction_reference",reference).eq("status","pending");return json(res,400,{error:message});}
  if(r.status===202||d.verification?.processingStatus!=="completed")return json(res,202,{pending:true,request_id:d.requestId||d.verification?.requestId,message:"Verification is processing. Keep this page open or wait for the webhook; manual review remains available."});
  const result=await applyVerified(user.id,bank,reference,d,settings.pro_price_etb);if(!result.approved){await admin.from("payment_submissions").update({status:"rejected",admin_note:result.reason,reviewed_at:new Date().toISOString()}).eq("user_id",user.id).eq("transaction_reference",reference).eq("status","pending");return json(res,422,{error:result.reason});}
  return json(res,200,{ok:true,pro_activated:true,message:"Payment verified and Project 30 Pro activated."});
 }catch(e){return json(res,502,{error:e.message||"Verify.ET request failed"});}
}
