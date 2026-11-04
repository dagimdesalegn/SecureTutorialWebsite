import {admin,requireUser,json,method,sessionValid} from "../lib/_lib.js";
export default async function handler(req,res){
 if(req.method!=="GET")return json(res,405,{error:"Method not allowed"});
 const h=req.headers.authorization||"",token=h.startsWith("Bearer ")?h.slice(7):null;
 if(!token)return json(res,401,{error:"Sign in required"});
 const {data:{user},error}=await admin.auth.getUser(token);if(error||!user)return json(res,401,{error:"Invalid sign-in"});
 const sid=req.headers["x-p30-session"];if(!sid||!(await sessionValid(user.id,sid)))return json(res,409,{error:"Active session required. Refresh your sign-in."});
 const {data:profile}=await admin.from("profiles").select("plan,pro_until").eq("id",user.id).maybeSingle();
 const {data:settings}=await admin.from("site_settings").select("*").eq("id",true).single();
 const {data:courses=[]}=await admin.from("courses").select("id,title,description,course_code,is_free,cover_url").order("created_at",{ascending:false});
 const {data:announcements=[]}=await admin.from("announcements").select("id,title,body,created_at").order("created_at",{ascending:false}).limit(10);
 if(req.query.course_id){
  const c=courses.find(x=>x.id===req.query.course_id);if(!c)return json(res,404,{error:"Course not found"});
  const pro=profile?.plan==="pro"&&(!profile.pro_until||new Date(profile.pro_until)>new Date());
  if(!c.is_free&&!pro)return json(res,200,{course:{...c,locked:true},chapters:[],resources:[]});
  const {data:chapters=[]}=await admin.from("chapters").select("*").eq("course_id",c.id).order("sort_order");
  const {data:resources=[]}=await admin.from("resources").select("*").eq("course_id",c.id);
  return json(res,200,{course:{...c,locked:false},chapters,resources});
 }
 const pro=profile?.plan==="pro"&&(!profile.pro_until||new Date(profile.pro_until)>new Date());
 return json(res,200,{settings,courses:courses.map(c=>({...c,locked:!c.is_free&&!pro})),announcements,profile:{plan:profile?.plan||"free"}});
}
