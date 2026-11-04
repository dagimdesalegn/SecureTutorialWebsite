import {admin,requireAdmin,json,method} from "../lib/_lib.js";
export default async function handler(req,res){if(!await requireAdmin(req,res))return;
 if(req.method==="GET") {const page=Math.max(1,Number(req.query.page)||1),perPage=50;const {data,error}=await admin.auth.admin.listUsers({page,perPage});if(error)return json(res,500,{error:"Could not load students"});const ids=(data.users||[]).map(u=>u.id);const {data:profiles=[]}=ids.length?await admin.from("profiles").select("id,full_name,plan,pro_until,created_at").in("id",ids):{data:[]};const byId=Object.fromEntries(profiles.map(p=>[p.id,p]));return json(res,200,{students:(data.users||[]).map(u=>({id:u.id,email:u.email,created_at:u.created_at,last_sign_in_at:u.last_sign_in_at,...(byId[u.id]||{})})),page,total:data.total||null});}
 if(!method(req,res,"POST"))return;const {id,action,plan}=req.body||{};if(!id)return json(res,400,{error:"Student ID required"});
 if(action==="delete"){const {error}=await admin.auth.admin.deleteUser(id);if(error)return json(res,400,{error:"Could not delete student account"});return json(res,200,{ok:true});}
 if(action==="plan"){if(!["free","pro"].includes(plan))return json(res,400,{error:"Invalid plan"});const {error}=await admin.from("profiles").upsert({id,plan,pro_until:null},{onConflict:"id"});if(error)return json(res,500,{error:"Could not update student plan"});return json(res,200,{ok:true});}
 return json(res,400,{error:"Unknown student action"});
}
