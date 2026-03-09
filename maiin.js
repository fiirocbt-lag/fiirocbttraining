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

console.log("CBT script loaded");

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
let questions=[];
let sectionA=[];
let sectionB=[];

let answers={};
let currentQuestion=0;
let currentSection="A";

let timer;
let remainingTime=3600;

let candidatePin="";
let excelQuestions=[];


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


// restore selected answer
const saved=answers[currentSection+"_"+currentQuestion];
if(saved){
const radio=document.querySelector(`input[value="${saved}"]`);
if(radio) radio.checked=true;
}

}


// ================= SAVE ANSWER =================
function saveAnswer(){

const selected=document.querySelector('input[name="opt"]:checked');

if(selected){
answers[currentSection+"_"+currentQuestion]=selected.value;
}

}


// ================= NEXT =================
function nextQuestion(){

saveAnswer();

const list=currentSection==="A"?sectionA:sectionB;

if(currentQuestion<list.length-1){

currentQuestion++;
showQuestion();

}else{

if(currentSection==="A"){

alert("Section A completed. Starting Section B.");

currentSection="B";
currentQuestion=0;

showQuestion();

}else{

submitExam();

}

}

}


// ================= PREVIOUS =================
function prevQuestion(){

saveAnswer();

if(currentQuestion>0){

currentQuestion--;
showQuestion();

}

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

sectionA.forEach((q,i)=>{
if(answers["A_"+i]===q.correct) score++;
});

sectionB.forEach((q,i)=>{
if(answers["B_"+i]===q.correct) score++;
});

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


// ================= EVENTS =================
document.addEventListener("DOMContentLoaded",()=>{

// ADMIN PAGE
const loginBtn=document.getElementById("loginBtn");

if(loginBtn){

loginBtn.onclick=adminLogin;

document.getElementById("generatePinBtn").onclick=generatePIN;
document.getElementById("savePinBtn").onclick=savePIN;

}

// DOWNLOADS
const exportBtn=document.getElementById("exportBtn");
if(exportBtn) exportBtn.onclick=exportResults;


// CANDIDATE PAGE
const startBtn=document.getElementById("startBtn");

if(startBtn){

const agree=document.getElementById("agreeCheck");

agree.addEventListener("change",()=>{
startBtn.disabled=!agree.checked;
});

startBtn.onclick=startTest;

document.getElementById("nextBtn").onclick=nextQuestion;
document.getElementById("prevBtn").onclick=prevQuestion;
document.getElementById("submitBtn").onclick=submitExam;

}

// restart
const restartBtn=document.getElementById("restartBtn");
if(restartBtn) restartBtn.onclick=()=>location.reload();

});
