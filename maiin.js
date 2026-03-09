// ================= FIREBASE SETUP =================
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
createdAt: new Date()
});

alert("PIN saved successfully");

}

// ================= CSV UPLOAD =================
async function uploadCSV(file){

const text = await file.text();

const rows = text.split("\n");

let count = 0;

for(let i=1;i<rows.length;i++){

let row = rows[i];

if(!row.trim()) continue;

// SAFE CSV SPLIT
const cols = row.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

if(cols.length < 7) continue;

const section = cols[0].replace(/"/g,"").trim().toUpperCase();
const question = cols[1].replace(/"/g,"").trim();
const optionA = cols[2].replace(/"/g,"").trim();
const optionB = cols[3].replace(/"/g,"").trim();
const optionC = cols[4].replace(/"/g,"").trim();
const optionD = cols[5].replace(/"/g,"").trim();
const correct = cols[6].replace(/"/g,"").trim().toUpperCase();

await addDoc(collection(db,"questions"),{

section: section,
text: question,
optionA: optionA,
optionB: optionB,
optionC: optionC,
optionD: optionD,
correct: correct

});

count++;

}

alert(count + " questions uploaded successfully");

}

// ================= LOAD QUESTIONS =================
async function loadQuestions(){

const snapshot = await getDocs(collection(db,"questions"));

questions = snapshot.docs.map(doc=>doc.data());

sectionA = questions.filter(q=>q.section==="A");
sectionB = questions.filter(q=>q.section==="B");

currentSection = "A";
currentQuestion = 0;

showQuestion();

}

// ================= GET CURRENT LIST =================
function getCurrentList(){

return currentSection === "A" ? sectionA : sectionB;

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

document.getElementById("options").innerHTML = `

<div class="option">
<label>
<input type="radio" name="opt" value="A">
${q.optionA}
</label>
</div>

<div class="option">
<label>
<input type="radio" name="opt" value="B">
${q.optionB}
</label>
</div>

<div class="option">
<label>
<input type="radio" name="opt" value="C">
${q.optionC}
</label>
</div>

<div class="option">
<label>
<input type="radio" name="opt" value="D">
${q.optionD}
</label>
</div>

`;

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

}
else{

if(currentSection === "A"){

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

// ================= PREVIOUS QUESTION =================
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

// ================= SCORE =================
function calculateScore(){

let score = 0;

sectionA.forEach((q,i)=>{

if(answers["A_"+i] === q.correct){

score++;

}

});

sectionB.forEach((q,i)=>{

if(answers["B_"+i] === q.correct){

score++;

}

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

// ================= EVENT BINDINGS =================
document.addEventListener("DOMContentLoaded",()=>{

const loginBtn = document.getElementById("loginBtn");

if(loginBtn){

loginBtn.onclick = adminLogin;

document.getElementById("generatePinBtn").onclick = generatePIN;
document.getElementById("savePinBtn").onclick = savePIN;

document.getElementById("uploadBtn").onclick = ()=>{

const file = document.getElementById("uploadCSV").files[0];

if(file){

uploadCSV(file);

}
else{

alert("Select CSV file");

}

};

}

// CANDIDATE PAGE
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

// RESTART
const restartBtn = document.getElementById("restartBtn");

if(restartBtn){

restartBtn.onclick = ()=>location.reload();

}

});
