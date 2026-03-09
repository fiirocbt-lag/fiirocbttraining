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
let answers = {};
let currentQuestion = 0;
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

// ================= GENERATE PIN =================
function generatePIN(){

const pin = Math.floor(100000 + Math.random()*900000).toString();
document.getElementById("newPin").value = pin;

}

// ================= SAVE PIN =================
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
const rows = text.split("\n").slice(1);

let count = 0;

for(let row of rows){

const cols = row.split(",");

if(cols.length < 6) continue;
if(!cols[0].trim()) continue;

await addDoc(collection(db,"questions"),{

text: cols[0].trim(),
optionA: cols[1].trim(),
optionB: cols[2].trim(),
optionC: cols[3].trim(),
optionD: cols[4].trim(),
correct: cols[5].trim().toUpperCase()

});

count++;

}

alert(count + " questions uploaded successfully");

}

// ================= LOAD QUESTIONS =================
async function loadQuestions(){

const snapshot = await getDocs(collection(db,"questions"));

questions = snapshot.docs.map(doc => ({
id: doc.id,
...doc.data()
}));

questions = questions.sort(()=>Math.random()-0.5);

currentQuestion = 0;

showQuestion();

}

// ================= SHOW QUESTION =================
function showQuestion(){

const q = questions[currentQuestion];

document.getElementById("question").innerText = q.text;

const html = `

<div class="option">
<label>
<input type="radio" name="opt" value="A">
<span>A. ${q.optionA}</span>
</label>
</div>

<div class="option">
<label>
<input type="radio" name="opt" value="B">
<span>B. ${q.optionB}</span>
</label>
</div>

<div class="option">
<label>
<input type="radio" name="opt" value="C">
<span>C. ${q.optionC}</span>
</label>
</div>

<div class="option">
<label>
<input type="radio" name="opt" value="D">
<span>D. ${q.optionD}</span>
</label>
</div>

`;

document.getElementById("options").innerHTML = html;

document.getElementById("progress").innerText =
`Question ${currentQuestion+1} of ${questions.length}`;

// restore previous answer

if(answers[currentQuestion]){

document.querySelector(`input[value="${answers[currentQuestion]}"]`).checked = true;

}

}

// ================= SAVE ANSWER =================
function saveAnswer(){

const selected = document.querySelector('input[name="opt"]:checked');

if(selected){

answers[currentQuestion] = selected.value;

}

}

// ================= NEXT =================
function nextQuestion(){

saveAnswer();

if(currentQuestion < questions.length-1){

currentQuestion++;
showQuestion();

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
const secs = remainingTime%60;

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

const activePin = snap.data().activeCode;

if(pin !== activePin){
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

questions.forEach((q,i)=>{

if(answers[i] === q.correct){

score++;

}

});

return score;

}

// ================= SUBMIT =================
async function submitExam(){

clearInterval(timer);

const score = calculateScore();

await addDoc(collection(db,"results"),{

score: score,
total: questions.length,
pin: candidatePin,
submittedAt: new Date()

});

document.getElementById("quiz").classList.add("hidden");
document.getElementById("result").classList.remove("hidden");

document.getElementById("scoreText").innerText =
`You scored ${score} out of ${questions.length}`;

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
document.addEventListener("DOMContentLoaded", ()=>{

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

agree.addEventListener("change", ()=>{
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
