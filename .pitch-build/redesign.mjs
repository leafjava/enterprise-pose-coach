import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Presentation,PresentationFile,FileBlob} from '@oai/artifact-tool';
process.env.RUNTIME_NODE_MODULES='C:/Users/lubw1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const ROOT=process.cwd();
const TMP=path.join(ROOT,'.pitch-build');
const SKILL='C:/Users/lubw1/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations';
const PY='C:/Users/lubw1/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const FINAL=path.join(ROOT,'deliverables','练了么-全球智能体大赛A赛道路演-视觉升级版.pptx');
const C={blueSoft:'#EAF1FF',greenSoft:'#E9FBF4',panel:'#ECEFF3',bg:'#F7F8FA',ink:'#0B1324',navy:'#071427',blue:'#2155D9',green:'#008A68',muted:'#657187',white:'#FFFFFF',light:'#CBD5E1',amber:'#A46105'};
const FONT='Microsoft YaHei';
const p=Presentation.create({slideSize:{width:1280,height:720}});
const all=[];
const original=JSON.parse(await fs.readFile(path.join(TMP,'content.json'),'utf8'));
function box(s,x,y,w,h,fill=C.white){return s.shapes.add({geometry:'roundRect',position:{left:x,top:y,width:w,height:h},borderRadius:12,fill,line:{fill:'none',width:0}});}
function line(s,x,y,w,color='#D5D9E2',h=0){return s.shapes.add({geometry:'line',position:{left:x,top:y,width:w,height:h},line:{fill:color,width:2}});}
function arrow(s,x,y,w,color=C.blue){line(s,x,y,w-8,color);s.shapes.add({geometry:'chevron',position:{left:x+w-12,top:y-5,width:12,height:10},fill:color,line:{fill:'none',width:0}});}
function card(s,x,y,w,h,title,body,{fill=C.blueSoft,color=C.blue,size=25}={}){box(s,x,y,w,h,fill);txt(s,title,x+24,y+22,w-48,52,size,color,true);txt(s,body,x+24,y+82,w-48,h-90,20,(fill===C.navy||fill===C.blue)?C.light:C.muted);}
function newSlide(i,{dark=false}={}){const d=original[i-1];return slide(d.title,d.notes,d.source,{dark});}

function txt(s,t,x,y,w,h,size=24,color=C.ink,bold=false){
 const a=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 a.text=t;a.text.style={typeface:FONT,fontSize:size,color,bold,autoFit:'none',verticalAlignment:'top'};return a;
}
function slide(title,notes,source,{dark=false,tag=''}={}){
 const s=p.slides.add();s.background.fill=dark?C.navy:C.bg;
 const n=p.slides.items.length;
 if(title){txt(s,title,64,68,1152,76,40,dark?C.white:C.ink,true);line(s,64,146,1152,dark?'#284058':'#D5D9E2');}
 txt(s,tag || (n<=12?'练了么  /  2026 全球智能体大赛 A 赛道':'练了么  /  答辩备份'),64,32,1000,26,14,dark?C.light:C.muted,true);
 txt(s,String(n).padStart(2,'0'),1172,34,45,22,13,dark?C.light:C.muted);
 s.speakerNotes.textFrame.setText(notes+'\n\n依据：'+source);
 all.push({title,notes,source});return s;
}
function foot(s,t,color=C.muted){txt(s,t,64,654,1152,45,16,color);}
function col(s,x,num,title,body,w=340,y=220){txt(s,num,x,y,w,55,40,C.blue,true);txt(s,title,x,y+72,w,55,28,C.ink,true);txt(s,body,x,y+142,w,130,23,C.muted);}
async function pic(s,n,x,y,w,h){s.images.add({blob:new Uint8Array(await fs.readFile(path.join(TMP,'source-media',n))),contentType:'image/jpeg',alt:'练了么既有产品界面，Ghost Coach 可视化演示，非真人模型测试',fit:'contain',position:{left:x,top:y,width:w,height:h}});}
function table(s,values,widths,{y=190,h=400,size=21}={}){
 const t=s.tables.add({rows:values.length,columns:values[0].length,left:64,top:y,width:1152,height:h,columnWidths:widths,values});
 t.borders.assign({fill:'#D5D9E2',width:0.5,style:'solid'});
 t.cells.block({row:0,column:0,rowCount:values.length,columnCount:values[0].length}).assign({margins:{left:14,right:14,top:10,bottom:10},anchor:'center'});
 for(let r=0;r<values.length;r++)for(let c=0;c<values[0].length;c++){
  let a=t.getCell(r,c);a.fill=r===0?C.navy:(r%2?C.white:C.bg);a.text.style={typeface:FONT,fontSize:size,color:r===0?C.white:C.ink,bold:r===0||c===0};
 }
 return t;
}

// 01
{
let s=newSlide(1);
// The title is deliberately rebuilt in the reference deck's split composition.
s.shapes.items.slice(0).forEach(a=>a.delete());
box(s,698,0,582,720,C.navy);
txt(s,'练了么',64,62,570,95,66,C.ink,true);
txt(s,'让每一次岗位训练，\n都有人看动作',64,219,600,178,52,C.ink,true);
txt(s,'面向制造与仓储的\nAI 动作教练',68,448,570,105,30,C.blue,true);
txt(s,'2026 全球智能体大赛\nA 赛道 · 智能体搭建赛',68,610,560,68,20,C.muted);
box(s,741,174,493,310,'#14263B');await pic(s,'image4.jpeg',751,184,473,290);
txt(s,'即时指导',748,535,204,48,29,'#56D6B1',true);txt(s,'训练记录',1010,535,216,48,29,C.white,true);
txt(s,'员工看见怎么改',748,592,220,50,20,C.light);txt(s,'主管知道谁该复训',1010,592,228,50,20,C.light);

}
// 02
{
let s=newSlide(2);
const arr=[['员工','需要当场知道怎么改','“膝盖往外打开”\n比一条笼统评分更有用'],['班组长','需要逐个看动作','示范以后，仍要反复纠正\n人数增加，观察负担增加'],['企业','需要知道谁该复训','参加培训只是起点\n动作记录支持后续跟进']];
arr.forEach((a,i)=>{let x=64+i*394;box(s,x,205,364,343,i===2?C.navy:C.white);txt(s,'0'+(i+1),x+25,229,100,55,36,i===2?'#56D6B1':C.blue,true);txt(s,a[0],x+25,303,308,55,32,i===2?C.white:C.ink,true);txt(s,a[1],x+25,377,308,47,24,i===2?C.white:C.ink,true);txt(s,a[2],x+25,447,308,80,21,i===2?C.light:C.muted);});
txt(s,'入职、转岗、复训，都需要持续观察与记录',64,587,1152,50,30,C.green,true);

}
// 03
{
let s=slide('员工练一遍，主管拿到一份记录','练了么已经有 Web 实时教练和体能评估页面。员工选择动作项目，用摄像头练习，系统返回阶段、次数和纠错提示，结束后生成会话总结。这里展示的是既有产品的界面演示。企业任务分发与台账回写将在平台接入时补齐。我们的交付单位，是一项有过程、有结果的训练任务。','web_app.py /api/session/start、frame、stop 与 /api/certifications；原版产品截图。');
await pic(s,'image2.jpeg',64,195,790,444);
txt(s,'01  选择训练项目',898,213,318,50,26,C.blue,true);
txt(s,'动作和次数由任务约定',898,274,318,70,22,C.muted);
txt(s,'02  实时指导',898,361,318,50,26,C.blue,true);
txt(s,'阶段、纠错、完整周期计数',898,422,318,70,22,C.muted);
txt(s,'03  留下训练记录',898,507,318,50,26,C.green,true);
txt(s,'会话总结和认证记录',898,568,318,60,22,C.muted);
foot(s,'既有产品界面演示。企业任务分发与台账回写列入接入计划');
}
// 04
{
let s=slide('膝盖往外打开，指导就在动作发生时','请看这个深蹲示例。界面把需要调整的膝盖和躯干直接标出来，给出具体的动作提示。员工调整姿势，完成一次完整动作周期，次数随之增加。语音提示设有连续触发和冷却机制，避免每帧重复播报。这一页是 Ghost Coach 可视化界面演示，用来说明交互；真实模型效果应由摄像头演示和现场测试证明。答辩时，我们重点演示错误、纠正、计数这三个连续状态。','src/live_coach.py；src/ghost_coach.py；static/ghost-coach.js；原版错误状态截图。');
await pic(s,'image4.jpeg',64,190,864,486);
txt(s,'看见具体错误',969,216,250,70,28,C.ink,true);
txt(s,'膝盖与躯干\n直接在画面中提示',969,298,250,85,22,C.muted);
txt(s,'完成完整周期',969,420,250,70,28,C.green,true);
txt(s,'规则判断阶段\n累计动作次数',969,502,250,85,22,C.muted);
txt(s,'可视化界面演示',971,625,245,40,16,C.muted);
}
// 05
{
let s=slide('训练之外，现场风险也能及时提醒','在训练之外，我们增加了独立的现场安全模块。它使用 YOLO 姿态与独立 PPE 检测接口，配置了六类规则。规则持续成立才提醒，同类事件经过冷却再告警，并保存事件和可选截图。持续静止等信号只提示人员核查。代码模块已经开发，当前默认 PPE 权重还需要补齐，现场效果也需要单独验收。','src/pipeline_safety/rules.py、events.py、monitor.py；config/safety/default.json。');
txt(s,'6 类规则',64,192,335,85,54,C.blue,true);
txt(s,'过度弯腰 / 疑似跌倒\n头盔缺失 / 危险区进入\n低头静止 / 倒地静止',64,300,372,160,25,C.ink);
txt(s,'事件记录保留规则、持续时间、\n工位和确认状态，可保存截图',64,506,375,100,23,C.muted);
table(s,[['规则例子','持续时间','同类冷却'],['危险区进入','0.35 秒','6 秒'],['过度弯腰','1.5 秒','8 秒'],['头盔缺失','2 秒','12 秒']], [280,156,156],{y:202,h:300,size:23});
// Table occupies the right region, preserving editable settings evidence.
let t=s.tables.items[0];t.position={left:624,top:202,width:592,height:300};
txt(s,'持续门控 + 冷却 + 跟踪状态清理',624,544,592,48,25,C.green,true);
foot(s,'安全模块已开发。PPE 权重需补齐，规则参数需按工位验证；静止类信号仅用于提醒核查');
}
// 06
{
let s=newSlide(6);
box(s,64,182,250,422,C.navy);txt(s,'现场任务',90,219,204,92,34,C.white,true);txt(s,'一个智能体空间',90,322,204,47,23,'#56D6B1',true);txt(s,'选择标准\n完成训练\n生成记录\n安排复训',90,390,204,154,24,C.light);
arrow(s,316,393,43);
card(s,382,182,390,180,'4 个  任务与标准','任务调度、岗位标准\n训练计划、设备检查');
card(s,810,182,406,180,'5 个  训练与评估','动作教练、考核记录、复训\n动作答疑、批次报告');
card(s,382,393,390,180,'6 个  风险提醒','六类现场规则\n事件证据与处置提示',{fill:C.greenSoft,color:C.green});
card(s,810,393,406,180,'4 个  复核与模型','事件复核、样本管理\n模型训练、权重管理',{fill:C.greenSoft,color:C.green});
txt(s,'19 个建议角色，围绕同一任务交付独立结果',382,591,834,44,28,C.green,true);
foot(s,'空间搭建方案。发布与有效性待平台核验，各角色需独立工具、调用样例与失败分支');

}
// 07
{
let s=newSlide(7);
box(s,64,181,1152,76,C.navy);txt(s,'智能体协同',87,198,230,44,27,'#56D6B1',true);txt(s,'选择任务     解释结构化结果     安排复核与复训',325,201,861,44,25,C.white);
txt(s,'本地训练链',64,295,200,43,25,C.blue,true);
card(s,64,350,340,137,'17 关键点','RTMPose / RTMO',{size:27});arrow(s,409,419,55);
card(s,470,350,340,137,'11 类动作','ST-GCN 动作分类',{size:27});arrow(s,815,419,54);
card(s,876,350,340,137,'阶段、计数与纠错','几何规则',{fill:C.blue,color:C.white,size:27});
txt(s,'本地安全链',64,525,200,44,25,C.green,true);
box(s,275,514,455,80,C.greenSoft);txt(s,'YOLO Pose 与 PPE 检测接口',295,534,420,44,24,C.green,true);arrow(s,737,554,50,C.green);
box(s,795,514,421,80,C.greenSoft);txt(s,'时序规则判定与事件记录',816,534,380,44,24,C.green,true);
foot(s,'核心逐帧计数不依赖生成式模型；PPE 权重需补齐，目标设备延迟及并发需要实测');

}
// 08
{
let s=newSlide(8);
txt(s,'已经具备',64,181,800,44,23,C.green,true);
const xs=[64,360,656,952];const a=[['训练样本','本地数据输入'],['训练选优','选择最优 checkpoint'],['本地权重','保存模型文件'],['后续推理','直接加载使用']];
a.forEach((v,i)=>{card(s,xs[i],238,264,151,v[0],v[1],{fill:i===3?C.navy:C.greenSoft,color:i===3?C.white:C.green});if(i<3)arrow(s,xs[i]+270,314,22,C.green);});
txt(s,'企业接入计划',64,425,800,44,23,C.blue,true);
const b=[['授权与标准','企业样本与岗位规则'],['版本管理','按企业登记模型资产'],['独立评估','确认新增样本的效果'],['升级与回滚','批准后部署新版本']];
b.forEach((v,i)=>{card(s,xs[i],481,264,142,v[0],v[1],{fill:i===3?C.blue:C.blueSoft,color:i===3?C.white:C.blue});if(i<3)arrow(s,xs[i]+270,553,22);});
foot(s,'企业自动微调、租户隔离、版本注册与回滚仍需实现；长期积累经确认的岗位规则与纠错样本');

}
// 09
{
let s=newSlide(9);
box(s,64,190,375,427,C.navy);txt(s,'23',92,225,300,118,92,'#56D6B1',true);txt(s,'项流程测试通过',92,355,305,52,31,C.white,true);txt(s,'页面、契约与几何规则\n本次核查已重新执行',92,446,305,93,23,C.light);
const x=490;[['11','类动作分类','本地 ST-GCN 权重，范围可核对'],['6','类专项训练规则','阶段、计数与动作纠错，主演示深蹲'],['本地','视觉推理','本地模型权重，逐帧推理在本地']].forEach((a,i)=>{let y=190+i*145;box(s,x,y,726,126,C.white);txt(s,a[0],x+23,y+25,145,74,i===2?38:52,C.blue,true);txt(s,a[1],x+190,y+19,501,44,28,C.ink,true);txt(s,a[2],x+190,y+74,501,42,21,C.muted);});
foot(s,'流程测试不代表模型精度。企业现场泛化、误报漏报与设备性能，进入试点单独验收');

}
// 10
{
let s=newSlide(10);
txt(s,'首个购买场景',64,182,470,44,24,C.blue,true);txt(s,'制造 / 仓储\n一个有明确考核需求的训练点',64,246,505,124,35,C.ink,true);
txt(s,'推动：培训负责人或 EHS\n使用：班组长与一线员工\n部署：IT 参与确认',64,406,485,135,24,C.muted);
box(s,64,571,500,60,C.blueSoft);txt(s,'采购依据：复训效率与持续使用',86,584,456,40,23,C.blue,true);
card(s,631,216,272,198,'岗位适配','岗位规则确认\n部署与适配费',{fill:C.white});arrow(s,909,315,31);
card(s,946,216,270,198,'训练点服务','年度服务费\n持续复训与支持',{fill:C.greenSoft,color:C.green});
line(s,631,456,585);txt(s,'扩展到相邻岗位',642,490,560,47,30,C.ink,true);txt(s,'复用引擎与事件记录，新增经企业确认的规则\n现场维护与复核成本纳入毛利',642,554,560,77,22,C.muted);
foot(s,'收费方式为商业假设，尚无付费或签约证据；招聘与转岗评估保留为相邻场景');

}
// 11
{
let s=newSlide(11);
line(s,102,269,1080,'#AFC4F7');
const a=[['第 1 周','定标准','确认岗位动作\n记录人工基线'],['第 2 周','并行训练','AI 与人工同时记录\n保留分歧样例'],['第 3 周','测复杂场景','变化机位与遮挡\n不同员工参与'],['第 4 周','共同复盘','对照验收指标\n决定采购与扩展']];
a.forEach((v,i)=>{let x=64+i*294;box(s,x,223,264,91,i===3?C.green:C.blue);txt(s,v[0],x+22,245,220,46,30,C.white,true);card(s,x,336,264,190,v[1],v[2],{fill:C.white,color:C.ink,size:27});});
box(s,64,567,1152,67,C.navy);txt(s,'验收指标',85,583,176,43,25,'#56D6B1',true);txt(s,'工时    判断一致性    复核率    复训后错误率',280,583,912,43,25,C.white);
foot(s,'试点计划，尚非客户承诺。阈值提前共同约定；安全模块另测每摄像头小时误报与漏报');

}
// 12
{
let s=slide('练了么 · AI 动作教练',original[11].notes,original[11].source,{dark:true});
// Closing slide echoes the reference deck's large statement and focused ask.
txt(s,'我们寻找一家试点企业',64,195,1148,66,42,'#56D6B1',true);
const a=[['1 个','训练点'],['1 位','岗位专家'],['4 周','并行验证']];
a.forEach((v,i)=>{let x=64+i*397;box(s,x,336,358,183,'#13273C');txt(s,v[0],x+23,360,100,55,38,'#56D6B1',true);txt(s,v[1],x+23,436,312,51,29,C.white,true);});
txt(s,'让一线员工做对动作，让主管看见进步',64,580,1152,55,35,C.white,true);

}
// 13
{
let s=slide('智能体分工 01–10：任务与训练','这些是建议搭建的独立智能体。独立性需要由工具、输入、输出和失败处理证明。优先完成其中至少十个的实际平台运行，并根据平台规则核验有效性。表格中列出的工具能力有已有代码基础，也有需要补齐的业务适配。','本次 A 赛道空间方案，平台发布待核验。',{tag:'答辩备份 · 建议搭建清单'});
table(s,[['智能体','输入 / 工具','独立产物与验收点'],['01 任务调度','自然语言任务 / 任务适配器','任务拆解、负责人、缺失信息追问'],['02 岗位标准','岗位与动作 / 企业标准库','带来源和版本的标准，未知标准转确认'],['03 训练计划','人员项目 / 计划工具','训练项目与次数，缺失目标时追问'],['04 设备检查','机位与帧 / 质量检测工具','入镜检查和调整建议，不足时阻止开始'],['05 动作教练','会话帧 / 本地推理 API','阶段、次数、纠错与总结'],['06 考核记录','服务端会话 / 记录适配器','可追溯记录，拒绝无依据的次数'],['07 复训安排','错误摘要 / 计划工具','错误对应的复训任务与复测条件'],['08 动作答疑','员工问题 / 标准知识库','有来源的动作说明，超范围转人工'],['09 批次报告','会话集合 / 汇总工具','完成清单、分歧项与需复训人员'],['10 弯腰提醒','姿态事件 / bend 规则','角度与持续时间，未达门控不告警']],[235,410,507],{y:174,h:468,size:18});
foot(s,'角色方案尚需平台配置与调用记录。共用底层工具时，各角色仍应交付不同的业务结果');
}
// 14
{
let s=slide('智能体分工 11–19：安全、复核与模型','六类安全规则可以封装为相应的风险智能体，输出不同的事件证据和处置建议。复核智能体记录人工确认结果，样本管理与模型智能体管理授权数据和评估。尤其要验证失败分支，例如 PPE 权重缺失时报告不可用，不能把没有输出解释为人员安全。','src/pipeline_safety/ 提供安全工具基础，其余业务适配及平台角色为方案。',{tag:'答辩备份 · 建议搭建清单'});
table(s,[['智能体','输入 / 工具','独立产物与验收点'],['11 跌倒提醒','姿态事件 / fall 规则','疑似跌倒证据和人员核查提示'],['12 头盔检查','PPE 检测 / no_helmet 规则','缺失事件，模型不可用时明确报告'],['13 危险区提醒','区域配置 / danger_zone 规则','进入部位、区域和持续时间'],['14 低头静止提醒','姿态序列 / drowsy 规则','静止事件与核查提示'],['15 倒地静止提醒','姿态序列 / unconscious 规则','异常姿态事件与紧急核查提示'],['16 事件复核','事件与人工意见 / 事件库','确认、撤销或待跟进的处置记录'],['17 样本管理','授权样本 / 数据处理工具','授权范围、质量检查与训练划分'],['18 模型训练','数据版本 / 训练脚本','checkpoint 与独立评估报告'],['19 权重管理','评估与批准 / 资产注册工具','版本登记、加载与回滚记录']],[235,410,507],{y:179,h:458,size:18});
foot(s,'目标为 19 个角色；有效数量以平台验收为准。静止类识别输出行为信号，交由人员核查');
}
// 15
{
let s=slide('交付状态与下一步验收','项目当前最成熟的是训练 Web 主链。安全模块已有代码和事件记录，但默认 PPE 权重缺失，需要先补齐并联调。企业治理功能主要处在契约设计阶段，平台空间也需要提供发布与调用证据。正式考核前，要把记录与服务端会话绑定，完成鉴权和防重放。我们以这些明确的验收项控制下一阶段交付。','源码核查：web_app.py、src/pipeline_safety/、config/safety/default.json、references/api-mapping.md；本次测试结果。',{tag:'答辩备份 · 实现边界'});
table(s,[['范围','当前证据','下一步验收'],['训练 Web 主链','页面、会话、计数、纠错、总结代码','真实摄像头连续演示与稳定性记录'],['安全模块','姿态检测、6 类规则、事件库与确认接口','补齐 PPE 权重，现场评估误报漏报'],['模型能力','本地权重、训练脚本、加载代码','按受试者/场地分组的独立测试'],['平台空间','19 角色分工方案','至少 10 个有效智能体与协作运行记录'],['企业治理','字段契约及 API 映射','鉴权、幂等回写、隔离、版本与回滚'],['正式考核','认证记录接口已有','服务端会话绑定、人工复核与防重放']],[235,455,462],{y:184,h:414,size:20});
foot(s,'核心推理可本地部署；目标设备吞吐量、现场收益及企业级治理尚不能视为已经验收');
}
// 16
{
let s=slide('收费空间，先用客户的工时账来算','这是测算示例，不是试点结果。假设一个训练点每月一千二百人次，每人减少五分钟观察整理，但仍需要一分钟复核，综合人工成本每小时六十元。月度净节省八十小时，对应四千八百元。这个金额还没有扣设备、软件、部署和维护。只有客户实测后仍有足够净收益，年度服务才有定价空间。','本次商业假设与算术示例：1200×(5−1)/60=80 小时，80×60=4800 元/月。',{tag:'答辩备份 · 假设测算，非试点收益'});
table(s,[['可替换输入','示例假设'],['每月训练量','1,200 人次'],['每人减少观察与整理时间','5 分钟'],['每人新增复核时间','1 分钟'],['综合人工成本','60 元 / 小时']],[420,260],{y:190,h:345,size:24});
s.tables.items[0].position={left:64,top:190,width:680,height:345};
txt(s,'80 小时 / 月',812,229,405,75,45,C.blue,true);
txt(s,'净节省工时',812,311,405,45,24,C.muted);
txt(s,'4,800 元 / 月',812,414,405,75,43,C.green,true);
txt(s,'对应人工成本',812,496,405,45,24,C.muted);
foot(s,'未扣设备、部署、软件和维护成本。用客户实测替换全部假设，再决定采购预算与报价');
}
// 17
{
let s=slide('现场演示：45 秒讲清一次完整动作','正式演示先确认真实模型、相机与机位已准备好。前十秒展示入镜和项目，接下来用一次明显错误动作展示纠错，再完成正确周期和计数，最后展示会话总结。若摄像头或模型不可用，明确说明本次无法判定，切换到可视化页面解释交互。不能把固定姿态演示当成真实推理结果。','项目 /coach、/api/session/*、Ghost Coach 演示入口；本次演示设计。',{tag:'答辩备份 · 演示执行'});
table(s,[['时间','观众看到什么','要证明什么'],['0–10 秒','选择深蹲项目，全身入镜','真实模型链路与机位已经准备好'],['10–22 秒','一次动作错误，出现具体提示','系统指出需要调整的关节与姿态'],['22–35 秒','调整姿势，完成完整动作周期','次数随完整周期增加'],['35–45 秒','结束会话，展示训练总结','过程可以形成后续复训依据']],[185,460,507],{y:196,h:350,size:24});
txt(s,'故障时：明确说明无法判定，使用标注清楚的界面演示继续讲解',64,583,1152,55,27,C.green,true);
foot(s,'当前 PPT 使用既有界面图片，未嵌入真人演示视频；正式路演前按上述顺序录制');
}

const candidate=path.join(TMP,'redesign-candidate.pptx');
await (await PresentationFile.exportPptx(p)).save(candidate);
const {finalizePresentation}=await import(pathToFileURL(path.join(SKILL,'container_tools/artifact_tool_utils.mjs')).href);
const result=await finalizePresentation({workspaceDir:ROOT,candidatePath:candidate,finalPath:FINAL,pythonExecutable:PY,integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit',...[5,13,14,15,16,17].flatMap(n=>['--require-native-table-slide',String(n)])],fontPolicy:{basis:'design',families:[FONT]},explicitTotalSlideCount:17,requiredNativeTableOwnerSlides:[5,13,14,15,16,17],verifyArtifactToolImport:true,receiptPath:path.join(TMP,'redesign-validation-final2.json')});
console.log(JSON.stringify(result));



