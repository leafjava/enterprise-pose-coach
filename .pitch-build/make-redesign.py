from pathlib import Path
import re
p=Path('.pitch-build/build.mjs')
s=p.read_text(encoding='utf-8')
s=s.replace("练了么-全球智能体大赛A赛道路演.pptx","练了么-全球智能体大赛A赛道路演-视觉升级版.pptx")
s=s.replace("const C={", "const C={blueSoft:'#EAF1FF',greenSoft:'#E9FBF4',panel:'#ECEFF3',")
s=s.replace("const all=[];", """const all=[];
const original=JSON.parse(await fs.readFile(path.join(TMP,'content.json'),'utf8'));
function box(s,x,y,w,h,fill=C.white){return s.shapes.add({geometry:'roundRect',position:{left:x,top:y,width:w,height:h},borderRadius:12,fill,line:{fill:'none',width:0}});}
function line(s,x,y,w,color='#D5D9E2',h=0){return s.shapes.add({geometry:'line',position:{left:x,top:y,width:w,height:h},line:{fill:color,width:2}});}
function arrow(s,x,y,w,color=C.blue){line(s,x,y,w-8,color);s.shapes.add({geometry:'chevron',position:{left:x+w-12,top:y-5,width:12,height:10},fill:color,line:{fill:'none',width:0}});}
function card(s,x,y,w,h,title,body,{fill=C.blueSoft,color=C.blue,size=25}={}){box(s,x,y,w,h,fill);txt(s,title,x+24,y+22,w-48,52,size,color,true);txt(s,body,x+24,y+82,w-48,h-90,20,fill===C.navy?C.light:C.muted);}
function newSlide(i,{dark=false}={}){const d=original[i-1];return slide(d.title,d.notes,d.source,{dark});}
""")
s=s.replace("if(title)txt(s,title,64,72,1152,90,40,dark?C.white:C.ink,true);", "if(title){txt(s,title,64,68,1152,76,40,dark?C.white:C.ink,true);line(s,64,146,1152,dark?'#284058':'#D5D9E2');}")
s=s.replace("if(tag)txt(s,tag,64,32,1000,26,14,dark?C.light:C.muted,true);", "txt(s,tag || (n<=12?'练了么  /  2026 全球智能体大赛 A 赛道':'练了么  /  答辩备份'),64,32,1000,26,14,dark?C.light:C.muted,true);")
def repl(n,code):
 global s
 pat=rf'// {n:02d}\n\{{.*?(?=// {n+1:02d}\n|\nawait fs.writeFile)'
 s,c=re.subn(pat,lambda m:f'// {n:02d}\n{{\n{code}\n}}\n',s,flags=re.S)
 assert c==1,(n,c)
repl(1,"""let s=newSlide(1);
// The title is deliberately rebuilt in the reference deck's split composition.
s.shapes.items.slice(0).forEach(a=>a.delete());
box(s,698,0,582,720,C.navy);
txt(s,'练了么',64,62,570,95,66,C.ink,true);
txt(s,'让每一次岗位训练，\\n都有人看动作',64,219,600,178,52,C.ink,true);
txt(s,'面向制造与仓储的\\nAI 动作教练',68,448,570,105,30,C.blue,true);
txt(s,'2026 全球智能体大赛\\nA 赛道 · 智能体搭建赛',68,610,560,68,20,C.muted);
box(s,741,174,493,310,'#14263B');await pic(s,'image4.jpeg',751,184,473,290);
txt(s,'即时指导',748,535,204,48,29,'#56D6B1',true);txt(s,'训练记录',1010,535,216,48,29,C.white,true);
txt(s,'员工看见怎么改',748,592,220,50,20,C.light);txt(s,'主管知道谁该复训',1010,592,228,50,20,C.light);
""")
repl(2,"""let s=newSlide(2);
const arr=[['员工','需要当场知道怎么改','“膝盖往外打开”\\n比一条笼统评分更有用'],['班组长','需要逐个看动作','示范以后，仍要反复纠正\\n人数增加，观察负担增加'],['企业','需要知道谁该复训','参加培训只是起点\\n动作记录支持后续跟进']];
arr.forEach((a,i)=>{let x=64+i*394;box(s,x,205,364,343,i===2?C.navy:C.white);txt(s,'0'+(i+1),x+25,229,100,55,36,i===2?'#56D6B1':C.blue,true);txt(s,a[0],x+25,303,308,55,32,i===2?C.white:C.ink,true);txt(s,a[1],x+25,377,308,47,24,i===2?C.white:C.ink,true);txt(s,a[2],x+25,447,308,80,21,i===2?C.light:C.muted);});
txt(s,'入职、转岗、复训，都需要持续观察与记录',64,587,1152,50,30,C.green,true);
""")
repl(6,"""let s=newSlide(6);
box(s,64,182,250,422,C.navy);txt(s,'现场训练任务',90,219,204,92,34,C.white,true);txt(s,'一个智能体空间',90,322,204,47,23,'#56D6B1',true);txt(s,'选择标准\\n完成训练\\n生成记录\\n安排复训',90,390,204,154,24,C.light);
arrow(s,316,393,43);
card(s,382,182,390,180,'04  任务与标准','任务调度、岗位标准\\n训练计划、设备检查');
card(s,810,182,406,180,'05  训练与评估','动作教练、考核记录、复训\\n动作答疑、批次报告');
card(s,382,393,390,180,'06  风险提醒','六类现场规则\\n事件证据与处置提示',{fill:C.greenSoft,color:C.green});
card(s,810,393,406,180,'04  复核与模型','事件复核、样本管理\\n模型训练、权重管理',{fill:C.greenSoft,color:C.green});
txt(s,'19 个建议角色，围绕同一任务交付独立结果',382,591,834,44,28,C.green,true);
foot(s,'空间搭建方案。发布与有效性待平台核验，各角色需独立工具、调用样例与失败分支');
""")
repl(7,"""let s=newSlide(7);
box(s,64,181,1152,76,C.navy);txt(s,'智能体协同',87,198,230,44,27,'#56D6B1',true);txt(s,'选择任务     解释结构化结果     安排复核与复训',325,201,861,44,25,C.white);
txt(s,'本地训练链',64,295,200,43,25,C.blue,true);
card(s,64,350,340,137,'17 关键点','RTMPose / RTMO',{size:27});arrow(s,409,419,55);
card(s,470,350,340,137,'11 类动作','ST-GCN 动作分类',{size:27});arrow(s,815,419,54);
card(s,876,350,340,137,'阶段、计数与纠错','几何规则',{fill:C.blue,color:C.white,size:27});
txt(s,'本地安全链',64,525,200,44,25,C.green,true);
box(s,275,514,455,80,C.greenSoft);txt(s,'YOLO Pose 与 PPE 检测接口',295,534,420,44,24,C.green,true);arrow(s,737,554,50,C.green);
box(s,795,514,421,80,C.greenSoft);txt(s,'时序规则判定与事件记录',816,534,380,44,24,C.green,true);
foot(s,'核心逐帧计数不依赖生成式模型；PPE 权重需补齐，目标设备延迟及并发需要实测');
""")
repl(8,"""let s=newSlide(8);
txt(s,'已经具备',64,181,800,44,23,C.green,true);
const xs=[64,360,656,952];const a=[['训练样本','本地数据输入'],['训练选优','选择最优 checkpoint'],['本地权重','保存模型文件'],['后续推理','直接加载使用']];
a.forEach((v,i)=>{card(s,xs[i],238,264,151,v[0],v[1],{fill:i===3?C.navy:C.greenSoft,color:i===3?C.white:C.green});if(i<3)arrow(s,xs[i]+270,314,22,C.green);});
txt(s,'企业接入计划',64,425,800,44,23,C.blue,true);
const b=[['授权与标准','企业样本与岗位规则'],['版本管理','按企业登记模型资产'],['独立评估','确认新增样本的效果'],['升级与回滚','批准后部署新版本']];
b.forEach((v,i)=>{card(s,xs[i],481,264,142,v[0],v[1],{fill:i===3?C.blue:C.blueSoft,color:i===3?C.white:C.blue});if(i<3)arrow(s,xs[i]+270,553,22);});
foot(s,'企业自动微调、租户隔离、版本注册与回滚仍需实现；长期积累经确认的岗位规则与纠错样本');
""")
repl(9,"""let s=newSlide(9);
box(s,64,190,375,427,C.navy);txt(s,'23',92,225,300,118,92,'#56D6B1',true);txt(s,'项流程测试通过',92,355,305,52,31,C.white,true);txt(s,'页面、契约与几何规则\\n本次核查已重新执行',92,446,305,93,23,C.light);
const x=490;[['11','类动作分类','本地 ST-GCN 权重，范围可核对'],['6','类专项训练规则','阶段、计数与动作纠错，主演示深蹲'],['本地','视觉推理','本地模型权重，逐帧推理在本地']].forEach((a,i)=>{let y=190+i*145;box(s,x,y,726,126,C.white);txt(s,a[0],x+23,y+25,145,74,i===2?38:52,C.blue,true);txt(s,a[1],x+190,y+19,501,44,28,C.ink,true);txt(s,a[2],x+190,y+74,501,42,21,C.muted);});
foot(s,'流程测试不代表模型精度。企业现场泛化、误报漏报与设备性能，进入试点单独验收');
""")
repl(10,"""let s=newSlide(10);
txt(s,'首个购买场景',64,182,470,44,24,C.blue,true);txt(s,'制造 / 仓储\\n一个有明确考核需求的训练点',64,246,505,124,35,C.ink,true);
txt(s,'推动：培训负责人或 EHS\\n使用：班组长与一线员工\\n部署：IT 参与确认',64,406,485,135,24,C.muted);
box(s,64,571,500,60,C.blueSoft);txt(s,'采购依据：复训效率与持续使用',86,584,456,40,23,C.blue,true);
card(s,631,216,272,198,'岗位适配','岗位规则确认\\n部署与适配费',{fill:C.white});arrow(s,909,315,31);
card(s,946,216,270,198,'训练点服务','年度服务费\\n持续复训与支持',{fill:C.greenSoft,color:C.green});
line(s,631,456,585);txt(s,'扩展到相邻岗位',642,490,560,47,30,C.ink,true);txt(s,'复用引擎与事件记录，新增经企业确认的规则\\n现场维护与复核成本纳入毛利',642,554,560,77,22,C.muted);
foot(s,'收费方式为商业假设，尚无付费或签约证据；招聘与转岗评估保留为相邻场景');
""")
repl(11,"""let s=newSlide(11);
line(s,102,269,1080,'#AFC4F7');
const a=[['第 1 周','定标准','确认岗位动作\\n记录人工基线'],['第 2 周','并行训练','AI 与人工同时记录\\n保留分歧样例'],['第 3 周','测复杂场景','变化机位与遮挡\\n不同员工参与'],['第 4 周','共同复盘','对照验收指标\\n决定采购与扩展']];
a.forEach((v,i)=>{let x=64+i*294;box(s,x,223,264,91,i===3?C.green:C.blue);txt(s,v[0],x+22,245,220,46,30,C.white,true);card(s,x,336,264,190,v[1],v[2],{fill:C.white,color:C.ink,size:27});});
box(s,64,567,1152,67,C.navy);txt(s,'验收指标',85,583,176,43,25,'#56D6B1',true);txt(s,'工时    判断一致性    复核率    复训后错误率',280,583,912,43,25,C.white);
foot(s,'试点计划，尚非客户承诺。阈值提前共同约定；安全模块另测每摄像头小时误报与漏报');
""")
repl(12,"""let s=newSlide(12,{dark:true});
// Closing slide echoes the reference deck's large statement and focused ask.
txt(s,'我们寻找一家试点企业',64,195,1148,66,42,'#56D6B1',true);
const a=[['01','一个训练点'],['02','一位岗位专家'],['04','四周并行验证']];
a.forEach((v,i)=>{let x=64+i*397;box(s,x,336,358,183,'#13273C');txt(s,v[0],x+23,360,100,55,38,'#56D6B1',true);txt(s,v[1],x+23,436,312,51,29,C.white,true);});
txt(s,'让一线员工做对动作，让主管看见进步',64,580,1152,55,35,C.white,true);
""")
# Preserve original speaker scripts and avoid rewriting companion deliverables.
s=re.sub(r"await fs.writeFile\(path.join\(TMP,'content.json'\).*?const candidate=", "const candidate=",s,flags=re.S)
s=s.replace("'candidate.pptx'","'redesign-candidate.pptx'").replace("'validation.json'","'redesign-validation.json'")
s=s.replace("fill===C.navy?C.light:C.muted","(fill===C.navy||fill===C.blue)?C.light:C.muted")
p.with_name('redesign.mjs').write_text(s,encoding='utf-8')
