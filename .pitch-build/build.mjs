import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Presentation,PresentationFile,FileBlob} from '@oai/artifact-tool';
process.env.RUNTIME_NODE_MODULES='C:/Users/lubw1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const ROOT=process.cwd();
const TMP=path.join(ROOT,'.pitch-build');
const SKILL='C:/Users/lubw1/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations';
const PY='C:/Users/lubw1/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe';
const FINAL=path.join(ROOT,'deliverables','练了么-全球智能体大赛A赛道路演.pptx');
const C={bg:'#F7F8FA',ink:'#0B1324',navy:'#071427',blue:'#2155D9',green:'#008A68',muted:'#657187',white:'#FFFFFF',light:'#CBD5E1',amber:'#A46105'};
const FONT='Microsoft YaHei';
const p=Presentation.create({slideSize:{width:1280,height:720}});
const all=[];
function txt(s,t,x,y,w,h,size=24,color=C.ink,bold=false){
 const a=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 a.text=t;a.text.style={typeface:FONT,fontSize:size,color,bold,autoFit:'none',verticalAlignment:'top'};return a;
}
function slide(title,notes,source,{dark=false,tag=''}={}){
 const s=p.slides.add();s.background.fill=dark?C.navy:C.bg;
 const n=p.slides.items.length;
 if(title)txt(s,title,64,72,1152,90,40,dark?C.white:C.ink,true);
 if(tag)txt(s,tag,64,32,1000,26,14,dark?C.light:C.muted,true);
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
let s=slide('', '各位评委好，我们是练了么。员工看完培训视频以后，动作到底做对没有？我们希望让每一次岗位训练，都有人看动作。员工用摄像头练习，系统当场给出具体指导，主管看到训练记录和需要复训的地方。','项目 Web 主流程及本次商业定位。',{dark:true});
txt(s,'练了么',64,78,1120,92,72,C.white,true);
txt(s,'让每一次岗位训练，\n都有人看动作',64,225,1120,184,66,C.white,true);
txt(s,'面向制造与仓储的 AI 动作教练',68,468,1080,52,31,'#56D6B1',true);
txt(s,'2026 全球智能体大赛   A 赛道 · 智能体搭建赛',68,622,1110,35,21,C.light);
all[0].title='练了么：让每一次岗位训练，都有人看动作';
}
// 02
{
let s=slide('培训结束以后，谁来确认动作做对了？','想象一位刚入职的仓储员工。视频看过了，要求也听过了，真正开始做动作时，他依然需要有人提醒。班组长要逐个看、反复讲，企业还需要留下培训依据。这个断点会出现在入职、转岗和复训里。我们的切口，就是其中能够按标准观察和记录的动作。','场景假设，来自项目 PRD 与用户提供的制造、仓储场景，尚非客户访谈结论。');
col(s,64,'员工','需要当场知道怎么改','“膝盖往外打开”\n比一条笼统的评分更有用');
col(s,464,'班组长','需要逐个看动作','示范以后，还要反复纠正\n训练人数增加，观察负担增加');
col(s,864,'企业','需要知道谁该复训','参加过培训只是起点\n动作记录才能支持后续跟进',352);
foot(s,'同样的观察与记录任务，反复出现在入职、转岗和在岗训练中');
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
let s=slide('一个智能体空间，完成一项现场任务','A 赛道要求至少十个有效智能体。我们围绕业务任务设计十九个角色，分别负责任务、训练、安全和复核资产。比如一项新人训练，由任务调度选择标准，教练调用本地引擎，记录智能体整理结果，复训智能体给出下一次任务。每个角色都应有独立输入和可检查的输出。这一页是空间搭建方案，平台发布及有效性需要真实调用记录来证明。','用户提供的 A 赛道通知；本次提出的空间架构方案。',{tag:'A 赛道空间搭建方案 · 发布与有效性待平台核验'});
col(s,64,'4','任务与标准','任务调度、岗位标准\n训练计划、设备检查',246,210);
col(s,374,'5','训练与评估','动作教练、考核记录\n复训、答疑\n批次报告',246,210);
col(s,684,'6','风险提醒','对应六类现场规则\n输出事件证据\n提供处置提示',246,210);
col(s,994,'4','复核与模型','事件复核、样本\n模型训练\n权重管理',222,210);
txt(s,'协作结果：一份训练记录，带出一项有依据的复训任务',64,562,1152,60,31,C.green,true);
foot(s,'19 为建议分工数。每个智能体均需独立工具、调用样例及失败分支，不能以角色名称代替有效性');
}
// 07
{
let s=slide('实时判定留在本地，智能体负责业务协同','实时动作反馈需要稳定、可解释的判断。训练链用人体关键点和动作分类，加几何规则完成阶段、计数与纠错。安全链使用另一组检测器和规则。智能体负责选择任务、解释结果和安排后续工作，核心逐帧计数不依赖生成式模型。这样既能给出明确的错误原因，也保留本地部署的选择。具体边缘设备还需要测延迟和并发。','src/fitness_infer.py、src/live_coach.py、src/rtmpose_tran.py、src/pipeline_safety/detector.py；智能体协同为设计方案。');
txt(s,'训练链',64,204,220,50,30,C.blue,true);
txt(s,'人体 17 关键点\nRTMPose / RTMO',64,288,348,110,30,C.ink,true);
txt(s,'11 类动作分类\nST-GCN',464,288,348,110,30,C.ink,true);
txt(s,'阶段、计数与纠错\n几何规则',864,288,350,110,30,C.green,true);
txt(s,'安全链',64,446,220,50,30,C.blue,true);
txt(s,'YOLO Pose 与 PPE 检测接口',64,512,565,56,29,C.ink,true);
txt(s,'时序规则判定与事件记录',674,512,542,56,29,C.green,true);
foot(s,'智能体读取结构化结果，安排解释、复核与复训；目标边缘设备的延迟及并发需要实测');
}
// 08
{
let s=slide('企业自己的动作样本，可以反复使用','项目已经具备训练保存最优 checkpoint、以及后续加载本地权重的基础能力。下一阶段，我们要把授权的企业动作样本、岗位标准和复核结果串起来，按企业管理模型版本。新增样本经过独立评估以后再决定是否升级，并保留回滚记录。真正值得积累的是客户确认过的岗位规则和纠错样本。租户隔离、自动版本注册与回滚仍然是接入计划。','src/train.py；src/fitness_infer.py；skill-build/enterprise-pose-coach/references/api-mapping.md。');
txt(s,'已经具备',64,198,500,50,25,C.green,true);
txt(s,'训练选优\n保存本地权重\n后续加载推理',64,279,510,200,39,C.ink,true);
txt(s,'企业接入计划',674,198,542,50,25,C.blue,true);
txt(s,'授权样本与岗位标准\n按企业管理模型版本\n独立评估后升级与回滚',674,279,542,200,34,C.ink,true);
txt(s,'长期资产：经确认的岗位规则与纠错样本',64,563,1152,60,32,C.green,true);
foot(s,'本地训练与权重加载已有代码；企业自动微调、租户隔离、版本注册及回滚仍需实现');
}
// 09
{
let s=slide('技术底座，可以逐项核验','今天可以核验的是本地模型文件、十一类动作分类、六类专项动作规则和运行中的 Web 代码。这次重新执行的二十三项流程测试全部通过。它们验证页面、契约和几何规则。企业现场的模型精度还需要按受试者和工位独立测试，我们没有把旧训练验证数字当成现场准确率。','model/；src/fitness_infer.py；src/live_coach.py；本次 tools/harness.mjs test：23 tests OK；docs/real-evidence.md。');
col(s,64,'11','类动作分类','本地 ST-GCN 权重\n分类范围可核对',250,218);
col(s,374,'6','类专项训练规则','阶段、计数与动作纠错\n主演示选择深蹲',250,218);
col(s,684,'23','项流程测试通过','页面、契约、几何规则\n本次核查已重新执行',250,218);
col(s,994,'本地','视觉推理','本地模型权重\n逐帧推理在本地',222,218);
foot(s,'流程测试不代表模型精度。企业现场泛化、误报漏报与设备性能，进入试点单独验收');
}
// 10
{
let s=slide('第一笔收入，来自一个训练点','我们的第一笔收入，计划来自一个有明确动作考核需求的企业训练点。培训或 EHS 负责人推动，IT 参与，班组长使用。收费可以从岗位适配和部署开始，再按训练点收年度服务费。扩展到相邻岗位时，复用已有引擎和事件记录，新增客户确认的规则。是否成立，要看复训更省时、使用是否持续、现场维护成本能否控制。','商业化建议与收费假设，尚无付费客户或签约证据。');
txt(s,'谁购买',64,208,500,45,26,C.blue,true);
txt(s,'制造 / 仓储培训点',64,278,535,65,38,C.ink,true);
txt(s,'推动：培训负责人或 EHS\n使用：班组长和一线员工\n部署：IT 参与确认',64,376,530,150,26,C.muted);
txt(s,'怎么收费',674,208,542,45,26,C.blue,true);
txt(s,'岗位适配与部署费\n训练点年度服务费',674,278,542,125,36,C.ink,true);
txt(s,'验证一个点位后，扩展相邻岗位\n现场维护与复核成本纳入毛利',674,451,542,100,26,C.muted);
foot(s,'收费方式为商业假设。招聘/转岗评估保留为相邻场景，标准须由企业确认');
}
// 11
{
let s=slide('四周试点，把采购问题逐项回答','我们希望和一家制造或仓储企业做四周并行试点。第一周确认岗位动作和人工基线，第二周让 AI 与人工同时记录，第三周专门测试遮挡、机位变化和不同员工，第四周与负责人复盘。我们看每百人训练工时、计数和错误判断一致性、需要复核的比例，以及复训以后错误有没有减少。双方先约定验收阈值，再决定是否采购和扩展。','本次提出的试点计划，尚非客户承诺。');
col(s,64,'第 1 周','定标准','确认岗位动作\n记录人工基线',240,210);
col(s,374,'第 2 周','并行训练','AI 与人工同时记录\n保留分歧样例',240,210);
col(s,684,'第 3 周','测复杂场景','机位与遮挡变化\n不同员工参与\n统计错误与复核量',240,210);
col(s,994,'第 4 周','共同复盘','对照验收指标\n决定采购与扩展',222,210);
txt(s,'验收看四项：工时、判断一致性、复核率、复训后错误率',64,555,1152,70,31,C.green,true);
foot(s,'验收阈值在试点开始前由双方共同约定。安全模块另测每摄像头小时误报与漏报');
}
// 12
{
let s=slide('', '我们希望让一线员工每次练习都得到具体指导，让主管看见员工的进步。接下来，我们需要一家试点企业，开放一个训练点，也需要一位岗位专家，和我们一起确认动作与验收标准。四周以后，用现场记录决定产品下一步。谢谢各位。','本次试点合作请求。',{dark:true});
txt(s,'让一线员工做对动作，\n让主管看见进步',64,122,1148,194,64,C.white,true);
txt(s,'我们寻找一家试点企业',68,390,1100,57,34,'#56D6B1',true);
txt(s,'一个训练点，一位岗位专家，四周并行验证',68,473,1120,90,32,C.white);
txt(s,'练了么    AI 动作教练',68,628,1100,35,23,C.light);
all[11].title='让一线员工做对动作，让主管看见进步';
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

await fs.writeFile(path.join(TMP,'content.json'),JSON.stringify(all,null,2),'utf8');
await fs.writeFile(path.join(ROOT,'deliverables','练了么-A赛道逐页口播与答辩.md'),'# 练了么 A 赛道逐页口播与答辩\n\n主路演 1–12 页，建议约 5 分 40 秒。第 4 页预留动作演示时间。第 13–17 页用于答辩。\n\n'+all.map((x,i)=>`## ${String(i+1).padStart(2,'0')} ${x.title}\n\n${x.notes}\n`).join('\n'),'utf8');
const candidate=path.join(TMP,'candidate.pptx');
await (await PresentationFile.exportPptx(p)).save(candidate);
const {finalizePresentation}=await import(pathToFileURL(path.join(SKILL,'container_tools/artifact_tool_utils.mjs')).href);
const result=await finalizePresentation({workspaceDir:ROOT,candidatePath:candidate,finalPath:FINAL,pythonExecutable:PY,integrityValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(SKILL,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-heading-fit',...[5,13,14,15,16,17].flatMap(n=>['--require-native-table-slide',String(n)])],fontPolicy:{basis:'design',families:[FONT]},explicitTotalSlideCount:17,requiredNativeTableOwnerSlides:[5,13,14,15,16,17],verifyArtifactToolImport:true,receiptPath:path.join(TMP,'validation.json')});
console.log(JSON.stringify(result));
