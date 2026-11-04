import {admin,requireAdmin,json,method} from "../lib/_lib.js";
export default async function handler(req,res){
 if(!await requireAdmin(req,res))return;
 if(req.method==="GET"){
  const {data:items=[],error}=await admin.from("payment_submissions").select("*").eq("status","pending").order("created_at");
  if(error)return json(res,500,{error:"Could not load reviews"});
  const enriched=await Promise.all(items.map(async x=>{const [{data:u},{data:signed}]=await Promise.all([admin.auth.admin.getUserById(x.user_id),admin.storage.from("payment-proofs").createSignedUrl(x.proof_path,300)]);return {...x,email:u?.user?.email||"",proof_url:signed?.signedUrl||""};}));
  return json(res,200,{items:enriched});
 }
 if(!method(req,res,"POST"))return;
 const {id,status,note=""}=req.body||{};if(!id||!["approved","rejected"].includes(status))return json(res,400,{error:"Invalid review"});
 const {data:item}=await admin.from("payment_submissions").select("*").eq("id",id).single();if(!item||item.status!=="pending")return json(res,404,{error:"Pending payment not found"});
 const {error}=await admin.from("payment_submissions").update({status,admin_note:String(note).slice(0,500),reviewed_at:new Date().toISOString()}).eq("id",id);
 if(error)return json(res,500,{error:"Could not save review"});
 if(status==="approved"){const {error:e}=await admin.from("profiles").upsert({id:item.user_id,plan:"pro",pro_until:null},{onConflict:"id"});if(e)return json(res,500,{error:"Review saved but access update failed; retry by contacting support"});}
 return json(res,200,{ok:true});
}
