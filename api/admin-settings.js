import {admin,requireAdmin,json,method} from "../lib/_lib.js";
export default async function handler(req,res){
 if(!await requireAdmin(req,res))return;
 if(req.method==="GET"){
  if(req.query.announcements){const {data:announcements=[]}=await admin.from("announcements").select("*").order("created_at",{ascending:false});return json(res,200,{announcements});}
  const {data:settings}=await admin.from("site_settings").select("*").eq("id",true).single();return json(res,200,{settings});
 }
 if(!method(req,res,"POST"))return;
 const b=req.body||{};
 if(b.delete_announcement){const {error}=await admin.from("announcements").delete().eq("id",b.delete_announcement);if(error)return json(res,500,{error:"Delete failed"});return json(res,200,{ok:true});}
 if(b.announcement){const title=String(b.announcement.title||"").trim(),body=String(b.announcement.body||"").trim();if(!title||!body||title.length>120||body.length>3000)return json(res,400,{error:"Announcement is required and must be within limits"});const {error}=await admin.from("announcements").insert({title,body});if(error)return json(res,500,{error:"Publish failed"});return json(res,200,{ok:true});}
 const price=Number(b.pro_price_etb);if(!Number.isFinite(price)||price<1||price>100000)return json(res,400,{error:"Price must be between 1 and 100000 ETB"});
 const instructions={telebirr:String(b.payment_instructions?.telebirr||"").slice(0,1500),cbe:String(b.payment_instructions?.cbe||"").slice(0,1500)};
 const {error}=await admin.from("site_settings").upsert({id:true,pro_price_etb:price,payment_instructions:instructions});if(error)return json(res,500,{error:"Could not save settings"});return json(res,200,{ok:true});
}
