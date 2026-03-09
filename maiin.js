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


// ================= SHUFFLE FUNCTION =================
function shuffle(array){

for(let i = array.length - 1; i > 0; i--){

const j = Math.floor(Math.random() * (i + 1));

[array[i], array[j]] = [array[j], array[i]];

}

return array;

}


// ================= ADMIN LOGIN =================
function adminLogin(){

const pass = document.getElementById("adminPass").value.trim();
const name = document.getElementById("adminName").value.trim();

if(!name){
alert("Enter your name");
return;
}

if(pass !== "admin123"){
alert("Wrong password");
return;
}

document.getElementById("loginBox").classList.add("hidden");
document.getElementById("adminPanel").classList.remove("hidden");

loadAnalytics();

}


// ================= PIN MANAGEMENT =================
function generatePIN(){

const pin = Math.floor(100000 + Math.random()*900000).toString();

document.getElementById("newPin").value = pin;

}

async function savePIN(){

const pin = document.getElementById("newPin").value.trim();

if(!pin){
alert("Generate PIN first");
return;
}

await setDoc(doc(db,"system","masterCode"),{
activeCode: pin,
createdAt:new Date()
});

alert("PIN saved successfully");

}


// ================= EXCEL PREVIEW =================
function previewExcel(){

const file = document.getElementById("excelFile").files[0];

if(!file){
alert("Select Excel file");
return;
}

const reader = new FileReader();

reader.onload = function(e){

const data = new Uint8Array(e.target.result);

const workbook = XLSX.read(data,{type:"array"});

const sheet = workbook.Sheets[workbook.SheetNames[0]];

const rows = XLSX.utils.sheet_to_json(sheet,{header:1});

excelQuestions = [];

let html = "<table border='1' style='width:100%;margin-top:10px'>";

for(let i=1;i<rows.length;i++){

const r = rows[i];

if(!r[1]) continue;

const q = {

section:String(r[0]).trim().toUpperCase(),
text:String(r[1]).trim(),
optionA:String(r[2]).trim(),
optionB:String(r[3]).trim(),
optionC:String(r[4]).trim(),
optionD:String(r[5]).trim(),
correct:String(r[6]).trim().toUpperCase()

};

excelQuestions.push(q);

html += `
<tr>
<td>${q.section}</td>
<td>${q.text}</td>
<td>${q.correct}</td>
</tr>
`;

}

html += "</table>";

document.getElementById("excelPreview").innerHTML = html;

alert(excelQuestions.length + " questions loaded");

};

reader.readAsArrayBuffer(file);

}


// ================= UPLOAD QUESTIONS =================
async function uploadExcel(){

if(excelQuestions.length === 0){
alert("Preview Excel first");
return;
}

let count = 0;

const existing = await getDocs(collection(db,"questions"));

const existingTexts = existing.docs.map(d=>d.data().text);

for(const q of excelQuestions){

if(existingTexts.includes(q.text)){
console.log("Duplicate skipped:",q.text);
continue;
}

await addDoc(collection(db,"questions"),q);

count++;

}

document.getElementById("uploadStatus").innerText =
count + " questions uploaded";

alert(count + " questions uploaded successfully");

}


// ================= LOAD QUESTIONS =================
async function loadQuestions(){

const snapshot = await getDocs(collection(db,"questions"));

questions = snapshot.docs.map(d=>d.data());

sectionA = shuffle(questions.filter(q=>q.section==="A"));
sectionB = shuffle(questions.filter(q=>q.section==="B"));

currentSection = "A";
currentQuestion = 0;

showQuestion();

}


// ================= GET CURRENT LIST =================
function getCurrentList(){

return currentSection==="A" ? sectionA : sectionB;

}


// ================= SHOW QUESTION =================
function showQuestion(){

const list = getCurrentList();

if(list.length === 0){

document.getElementById("question").innerText =
"No questions found for Section " + currentSection;

return;

}

const q = list[currentQuestion];

document.getElementById("question").innerText = q.text;


// RANDOMIZE OPTIONS
const options = [

{key:"A", text:q.optionA},
{key:"B", text:q.optionB},
{key:"C", text:q.optionC},
{key:"D", text:q.optionD}

];

shuffle(options);

let html = "";

options.forEach(opt=>{

html += `
<div class="option">
<label>
<input type="radio" name="opt" value="${opt.key}">
${opt.text}
</label>
</div>
`;

});

document.getElementById("options").innerHTML = html;

document.getElementById("progress").innerText =
`Section ${currentSection} • Question ${currentQuestion+1} of ${list.length}`;

if(answers[currentSection+"_"+currentQuestion]){

document.querySelector(
`input[value="${answers[currentSection+"_"+currentQuestion]}"]`
).checked = true;

}

}


// ================= SAVE ANSWER =================
function saveAnswer(){

const selected = document.querySelector('input[name="opt"]:checked');

if(selected){

answers[currentSection+"_"+currentQuestion] = selected.value;

}

}


// ================= NEXT QUESTION =================
function nextQuestion(){

saveAnswer();

const list = getCurrentList();

if(currentQuestion < list.length-1){

currentQuestion++;

showQuestion();

}else{

if(currentSection === "A"){

alert("Section A completed. Starting Section B.");

currentSection = "B";
currentQuestion = 0;

showQuestion();

}else{

submitExam();

}

}

}


// ================= PREVIOUS =================
function prevQuestion(){

saveAnswer();

if(currentQuestion > 0){

currentQuestion--;

showQuestion();

}

}


// ================= TIMER =================
function startTimer(){

clearInterval(timer);

timer = setInterval(()=>{

remainingTime--;

const mins = Math.floor(remainingTime/60);
const secs = remainingTime % 60;

document.getElementById("timer").innerText =
`${mins}:${secs.toString().padStart(2,"0")}`;

if(remainingTime <= 0){

clearInterval(timer);
submitExam();

}

},1000);

}


// ================= START TEST =================
async function startTest(){

const pin = document.getElementById("pinCode").value.trim();

if(!pin){
alert("Enter PIN");
return;
}

const snap = await getDoc(doc(db,"system","masterCode"));

if(!snap.exists()){
alert("System error");
return;
}

if(pin !== snap.data().activeCode){
alert("Invalid PIN");
return;
}

candidatePin = pin;

document.getElementById("candidateForm").classList.add("hidden");
document.getElementById("quiz").classList.remove("hidden");

await loadQuestions();

startTimer();

}


// ================= CALCULATE SCORE =================
function calculateScore(){

let score = 0;

sectionA.forEach((q,i)=>{
if(answers["A_"+i] === q.correct) score++;
});

sectionB.forEach((q,i)=>{
if(answers["B_"+i] === q.correct) score++;
});

return score;

}


// ================= SUBMIT EXAM =================
async function submitExam(){

clearInterval(timer);

const total = sectionA.length + sectionB.length;

const score = calculateScore();

await addDoc(collection(db,"results"),{

pin:candidatePin,
score:score,
total:total,
submittedAt:new Date()

});

document.getElementById("quiz").classList.add("hidden");
document.getElementById("result").classList.remove("hidden");

document.getElementById("scoreText").innerText =
`You scored ${score} out of ${total}`;

}


// ================= ANALYTICS =================
async function loadAnalytics(){

const snapshot = await getDocs(collection(db,"results"));

const results = snapshot.docs.map(d=>d.data());

if(results.length === 0) return;

const scores = results.map(r=>r.score);

const avg = scores.reduce((a,b)=>a+b,0)/scores.length;

document.getElementById("totalCandidates").innerText = results.length;
document.getElementById("avgScore").innerText = avg.toFixed(1);
document.getElementById("highScore").innerText = Math.max(...scores);
document.getElementById("lowScore").innerText = Math.min(...scores);

document.getElementById("passCount").innerText =
scores.filter(s=>s>=50).length;

document.getElementById("failCount").innerText =
scores.filter(s=>s<50).length;

}


// ================= EVENTS =================
document.addEventListener("DOMContentLoaded",()=>{

const loginBtn = document.getElementById("loginBtn");

if(loginBtn){

loginBtn.onclick = adminLogin;

document.getElementById("generatePinBtn").onclick = generatePIN;
document.getElementById("savePinBtn").onclick = savePIN;

document.getElementById("previewExcelBtn").onclick = previewExcel;
document.getElementById("uploadExcelBtn").onclick = uploadExcel;

}

const startBtn = document.getElementById("startBtn");

if(startBtn){

const agree = document.getElementById("agreeCheck");

agree.addEventListener("change",()=>{

startBtn.disabled = !agree.checked;

});

startBtn.onclick = startTest;

document.getElementById("nextBtn").onclick = nextQuestion;
document.getElementById("prevBtn").onclick = prevQuestion;
document.getElementById("submitBtn").onclick = submitExam;

}

const restartBtn = document.getElementById("restartBtn");

if(restartBtn){
restartBtn.onclick = ()=>location.reload();
}

});
