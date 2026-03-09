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

// ================= ADMIN LOGIN =================
function adminLogin(){

const pass = document.getElementById("adminPass").value.trim();
const name = document.getElementById("adminName").value.trim();

if(!name){ alert("Enter your name"); return; }
if(pass !== "admin123"){ alert("Wrong password"); return; }

document.getElementById("loginBox").classList.add("hidden");
document.getElementById("adminPanel").classList.remove("hidden");

loadAnalytics();
}

// ================= PIN =================
function generatePIN(){
const pin = Math.floor(100000 + Math.random()*900000).toString();
document.getElementById("newPin").value = pin;
}

async function savePIN(){

const pin = document.getElementById("newPin").value.trim();
if(!pin){ alert("Generate PIN first"); return; }

await setDoc(doc(db,"system","masterCode"),{
activeCode: pin,
createdAt:new Date()
});

alert("PIN saved successfully");
}

// ================= CSV UPLOAD =================
async function uploadCSV(file){

const text = await file.text();
const rows = text.split("\n").slice(1);

let count = 0;

for(let row of rows){

if(!row.trim()) continue;

// robust CSV parsing
const cols = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);

if(!cols || cols.length < 7) continue;

await addDoc(collection(db,"questions"),{

section: cols[0].trim().toUpperCase(),
text: cols[1].trim(),
optionA: cols[2].trim(),
optionB: cols[3].trim(),
optionC: cols[4].trim(),
optionD: cols[5].trim(),
correct: cols[6].trim().toUpperCase()

});

count++;
}

alert(count+" questions uploaded successfully");
}

// ================= LOAD QUESTIONS =================
async function loadQuestions(){

const snapshot = await getDocs(collection(db,"questions"));

questions = snapshot.docs.map(doc=>({
id:doc.id,
...doc.data()
}));

sectionA = questions.filter(q=>q.section==="A");
sectionB = questions.filter(q=>q.section==="B");

sectionA = sectionA.sort(()=>Math.random()-0.5);
sectionB = sectionB.sort(()=>Math.random()-0.5);

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
"No questions found for Section "+currentSection;
return;
}

const q = list[currentQuestion];

document.getElementById("question").innerText = q.text;

document.getElementById("options").innerHTML = `
<div class="option">
<label><input type="radio" name="opt" value="A"> ${q.optionA}</label>
</div>

<div class="option">
<label><input type="radio" name="opt" value="B"> ${q.optionB}</label>
</div>

<div class="option">
<label><input type="radio" name="opt" value="C"> ${q.optionC}</label>
</div>

<div class="option">
<label><input type="radio" name="opt" value="D"> ${q.optionD}</label>
</div>
`;

document.getElementById("progress").innerText =
`Section ${currentSection} • Question ${currentQuestion+1} of ${list.length}`;

if(answers[currentSection+"_"+currentQuestion]){
document.querySelector(`input[value="${answers[currentSection+"_"+currentQuestion]}"]`).checked = true;
}
}

// ================= SAVE ANSWER =================
function saveAnswer(){

const selected = document.querySelector('input[name="opt"]:checked');

if(selected){
answers[currentSection+"_"+currentQuestion] = selected.value;
}
}

// ================= NEXT =================
function nextQuestion(){

saveAnswer();

const list = getCurrentList();

if(currentQuestion < list.length-1){

currentQuestion++;
showQuestion();

}
else{

if(currentSection==="A"){

alert("Section A completed. Starting Section B.");

currentSection = "B";
currentQuestion = 0;
showQuestion();

}
else{

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
if(!pin){ alert("Enter PIN"); return; }

const snap = await getDoc(doc(db,"system","masterCode"));
if(!snap.exists()){ alert("System error"); return; }

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

// ================= SCORE =================
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

// ================= SUBMIT =================
async function submitExam(){

clearInterval(timer);

const total = sectionA.length + sectionB.length;
const score = calculateScore();

await addDoc(collection(db,"results"),{

pin: candidatePin,
score: score,
total: total,
submittedAt: new Date()

});

document.getElementById("quiz").classList.add("hidden");
document.getElementById("result").classList.remove("hidden");

document.getElementById("scoreText").innerText =
`You scored ${score} out of ${total}`;
}

// ================= ADMIN ANALYTICS =================
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

document.getElementById("uploadBtn").onclick = ()=>{

const file = document.getElementById("uploadCSV").files[0];

if(file) uploadCSV(file);
else alert("Select CSV file");

};
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
restartBtn.onclick = ()=> location.reload();
}

});
