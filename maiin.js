console.log("CBT script loaded");
// ================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
getFirestore,
doc,
getDoc,
setDoc,
addDoc,
collection,
getDocs
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

const firebaseConfig = {
apiKey: "AIzaSyDhpaUGEie-UefnfftByWgjbdn9--x8Slc",
authDomain: "fiiro-cbt-system.firebaseapp.com",
projectId: "fiiro-cbt-system",
storageBucket: "fiiro-cbt-system.firebasestorage.app",
messagingSenderId: "152813456186",
appId: "1:152813456186:web:501ec9415973cf46221e03"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


// ================= GLOBAL STATE =================
let questions = [];
let sectionA = [];
let sectionB = [];

let answers = {};
let currentQuestion = 0;
let currentSection = "A";

let timer;
let remainingTime = 3600;

let candidatePin = "";
let excelQuestions = [];


// ================= SHUFFLE =================
function shuffle(array){

for(let i=array.length-1;i>0;i--){
const j=Math.floor(Math.random()*(i+1));
[array[i],array[j]]=[array[j],array[i]];
}

return array;

}


// ================= ADMIN LOGIN =================
function adminLogin(){

const pass=document.getElementById("adminPass").value.trim();
const name=document.getElementById("adminName").value.trim();

if(!name){ alert("Enter your name"); return; }

if(pass!=="admin123"){ alert("Wrong password"); return; }

document.getElementById("loginBox").classList.add("hidden");
document.getElementById("adminPanel").classList.remove("hidden");

loadAnalytics();

}


// ================= PIN =================
function generatePIN(){

const pin=Math.floor(100000+Math.random()*900000).toString();

document.getElementById("newPin").value=pin;

}


async function savePIN(){

const pin=document.getElementById("newPin").value.trim();

if(!pin){ alert("Generate PIN first"); return; }

await setDoc(doc(db,"system","masterCode"),{
activeCode:pin,
createdAt:new Date()
});

alert("PIN saved successfully");

}


// ================= EXCEL PREVIEW =================
function previewExcel(){

const file=document.getElementById("excelFile").files[0];

if(!file){ alert("Select Excel file"); return; }

const reader=new FileReader();

reader.onload=function(e){

const data=new Uint8Array(e.target.result);
const workbook=XLSX.read(data,{type:"array"});
const sheet=workbook.Sheets[workbook.SheetNames[0]];
const rows=XLSX.utils.sheet_to_json(sheet,{header:1});

excelQuestions=[];

let html="<table border='1' style='width:100%;margin-top:10px'>";

for(let i=1;i<rows.length;i++){

const r=rows[i];
if(!r[1]) continue;

const q={
section:String(r[0]).trim().toUpperCase(),
text:String(r[1]).trim(),
optionA:String(r[2]).trim(),
optionB:String(r[3]).trim(),
optionC:String(r[4]).trim(),
optionD:String(r[5]).trim(),
correct:String(r[6]).trim().toUpperCase()
};

excelQuestions.push(q);

html+=`<tr>
<td>${q.section}</td>
<td>${q.text}</td>
<td>${q.correct}</td>
</tr>`;

}

html+="</table>";

document.getElementById("excelPreview").innerHTML=html;

alert(excelQuestions.length+" questions loaded");

};

reader.readAsArrayBuffer(file);

}


// ================= UPLOAD QUESTIONS =================
async function uploadExcel(){

if(excelQuestions.length===0){
alert("Preview Excel first");
return;
}

let count=0;

const existing=await getDocs(collection(db,"questions"));
const existingTexts=existing.docs.map(d=>d.data().text);

for(const q of excelQuestions){

if(existingTexts.includes(q.text)) continue;

await addDoc(collection(db,"questions"),q);
count++;

}

document.getElementById("uploadStatus").innerText=count+" questions uploaded";
alert(count+" questions uploaded successfully");

}


// ================= LOAD QUESTIONS =================
async function loadQuestions(){

const snapshot=await getDocs(collection(db,"questions"));

questions=snapshot.docs.map(d=>d.data());

sectionA=shuffle(questions.filter(q=>q.section==="A"));
sectionB=shuffle(questions.filter(q=>q.section==="B"));

currentSection="A";
currentQuestion=0;

showQuestion();

}


// ================= SHOW QUESTION =================
function showQuestion(){

const list=currentSection==="A"?sectionA:sectionB;

if(list.length===0){
document.getElementById("question").innerText="No questions found";
return;
}

const q=list[currentQuestion];

document.getElementById("question").innerText=q.text;

const options=[
{key:"A",text:q.optionA},
{key:"B",text:q.optionB},
{key:"C",text:q.optionC},
{key:"D",text:q.optionD}
];

shuffle(options);

let html="";

options.forEach(opt=>{
html+=`
<div class="option">
<label>
<input type="radio" name="opt" value="${opt.key}">
${opt.text}
</label>
</div>`;
});

document.getElementById("options").innerHTML=html;

document.getElementById("progress").innerText=
`Section ${currentSection} • Question ${currentQuestion+1} of ${list.length}`;

}


// ================= TIMER =================
function startTimer(){

clearInterval(timer);

timer=setInterval(()=>{

remainingTime--;

const mins=Math.floor(remainingTime/60);
const secs=remainingTime%60;

document.getElementById("timer").innerText=
`${mins}:${secs.toString().padStart(2,"0")}`;

if(remainingTime<=0){
clearInterval(timer);
submitExam();
}

},1000);

}


// ================= START TEST =================
async function startTest(){

const pin=document.getElementById("pinCode").value.trim();

if(!pin){ alert("Enter PIN"); return; }

const snap=await getDoc(doc(db,"system","masterCode"));

if(!snap.exists()){ alert("System error"); return; }

if(pin!==snap.data().activeCode){ alert("Invalid PIN"); return; }

candidatePin=pin;

document.getElementById("candidateForm").classList.add("hidden");
document.getElementById("quiz").classList.remove("hidden");

await loadQuestions();
startTimer();

}


// ================= SCORE =================
function calculateScore(){

let score=0;

sectionA.forEach((q,i)=>{ if(answers["A_"+i]===q.correct) score++; });
sectionB.forEach((q,i)=>{ if(answers["B_"+i]===q.correct) score++; });

return score;

}


// ================= SUBMIT EXAM =================
async function submitExam(){

clearInterval(timer);

const total=sectionA.length+sectionB.length;
const score=calculateScore();

await addDoc(collection(db,"results"),{
pin:candidatePin,
score:score,
total:total,
submittedAt:new Date()
});

document.getElementById("quiz").classList.add("hidden");
document.getElementById("result").classList.remove("hidden");

document.getElementById("scoreText").innerText=
`You scored ${score} out of ${total}`;

}


// ================= ADMIN ANALYTICS =================
async function loadAnalytics(){

const snapshot=await getDocs(collection(db,"results"));
const results=snapshot.docs.map(d=>d.data());

if(results.length===0) return;

const scores=results.map(r=>r.score);
const totals=results.map(r=>r.total);

const avg=scores.reduce((a,b)=>a+b,0)/scores.length;

const passCount=scores.filter((s,i)=>s/totals[i]>=0.5).length;

const passRate=((passCount/results.length)*100).toFixed(1)+"%";

document.getElementById("totalCandidates").innerText=results.length;
document.getElementById("avgScore").innerText=avg.toFixed(1);
document.getElementById("passCount").innerText=passCount;
document.getElementById("failCount").innerText=results.length-passCount;

document.getElementById("passRate").innerText=passRate;


// TOP 5
const sorted=[...results].sort((a,b)=>b.score-a.score).slice(0,5);

let topHTML="";

sorted.forEach(r=>{
topHTML+=`<li>${r.pin} - ${r.score}/${r.total}</li>`;
});

const topBox=document.getElementById("topCandidates");
if(topBox) topBox.innerHTML=topHTML;

}


// ================= DOWNLOAD RESULTS =================
async function exportResults(){

const snapshot=await getDocs(collection(db,"results"));

let csv="PIN,Score,Total,SubmittedAt,%Achieved,Status\n";

snapshot.forEach(docu=>{

const d=docu.data();

let date="";
if(d.submittedAt){
date=new Date(d.submittedAt.seconds*1000)
.toISOString()
.replace("T"," ")
.substring(0,19);
}

let percent=0;
if(d.total>0){
percent=Math.round((d.score/d.total)*100);
}

let status=percent>=50?"PASS":"FAIL";

csv+=`${d.pin},${d.score},${d.total},${date},${percent}%,${status}\n`;

});

const blob=new Blob([csv],{type:"text/csv"});
const link=document.createElement("a");

link.href=URL.createObjectURL(blob);
link.download="cbt_results.csv";

document.body.appendChild(link);
link.click();
document.body.removeChild(link);

}


// ================= DOWNLOAD ADMIN LOG =================
async function downloadAuditLog(){

const snapshot=await getDocs(collection(db,"codeArchive"));

let csv="Code,CreatedAt,ExpiredAt,CreatedBy,TimesUsed\n";

for(const docu of snapshot.docs){

const d=docu.data();

let created="";
let expired="";

if(d.createdAt){
created=new Date(d.createdAt.seconds*1000)
.toISOString().replace("T"," ").substring(0,19);
}

if(d.expiredAt){
expired=new Date(d.expiredAt.seconds*1000)
.toISOString().replace("T"," ").substring(0,19);
}

// PIN usage counter
const results=await getDocs(collection(db,"results"));
let usage=0;

results.forEach(r=>{
if(r.data().pin===d.code) usage++;
});

csv+=`${d.code},${created},${expired},${d.createdBy},${usage}\n`;

}

const blob=new Blob([csv],{type:"text/csv"});
const link=document.createElement("a");

link.href=URL.createObjectURL(blob);
link.download="admin_activity_log.csv";

document.body.appendChild(link);
link.click();
document.body.removeChild(link);

}


// ================= EVENTS =================
document.addEventListener("DOMContentLoaded",()=>{

const loginBtn=document.getElementById("loginBtn");

if(loginBtn){

loginBtn.onclick=adminLogin;

document.getElementById("generatePinBtn").onclick=generatePIN;
document.getElementById("savePinBtn").onclick=savePIN;

document.getElementById("previewExcelBtn").onclick=previewExcel;
document.getElementById("uploadExcelBtn").onclick=uploadExcel;

}

const auditBtn=document.getElementById("downloadAuditBtn");
if(auditBtn) auditBtn.onclick=downloadAuditLog;

const exportBtn=document.getElementById("exportBtn");
if(exportBtn) exportBtn.onclick=exportResults;

});
