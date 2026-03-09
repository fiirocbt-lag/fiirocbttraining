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
let currentQuestion = 0;
let answers = {};
let state = {
  remaining: 3600,
  timer: null,
  staff: null,
  adminMeta: null
};

// ================= ADMIN LOGIN =================
function adminLogin() {

  const pass = document.getElementById("adminPass").value.trim();
  const name = document.getElementById("adminName").value.trim();

  if (!name) return alert("Enter name");
  if (pass !== "admin123") return alert("Wrong password");

  state.adminMeta = { name };

  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("adminPanel").classList.remove("hidden");

  loadCurrentPin();
  loadResultsDashboard();
}

// ================= PIN FUNCTIONS =================
async function loadCurrentPin() {

  const ref = doc(db,"system","masterCode");
  const snap = await getDoc(ref);

  const list = document.getElementById("pinList");

  if (!list) return;

  if (snap.exists()) {
    list.innerHTML = `<li>${snap.data().activeCode}</li>`;
  } else {
    list.innerHTML = `<li>No Active PIN</li>`;
  }
}

function generatePIN() {

  const pin = Math.floor(100000 + Math.random()*900000).toString();
  document.getElementById("newPin").value = pin;
}

async function savePIN() {

  const pin = document.getElementById("newPin").value.trim();
  if (!pin) return alert("Generate PIN first");

  const ref = doc(db,"system","masterCode");

  await setDoc(ref,{
    activeCode: pin,
    createdAt: new Date(),
    createdBy: state.adminMeta.name
  });

  alert("PIN saved successfully");
  loadCurrentPin();
}

// ================= CSV UPLOAD =================
async function uploadQuestionsCSV(file){

  const text = await file.text();
  const rows = text.split("\n").slice(1);

  for(let row of rows){

    const cols = row.split(",");

    if(cols.length < 6) continue;

    await addDoc(collection(db,"questions"),{
      text: cols[0],
      optionA: cols[1],
      optionB: cols[2],
      optionC: cols[3],
      optionD: cols[4],
      correct: cols[5].trim()
    });

  }

  alert("Questions uploaded successfully.");
}

// ================= LOAD QUESTIONS =================
async function loadQuestions(){

  const snapshot = await getDocs(collection(db,"questions"));

  questions = snapshot.docs.map(d => ({
    id: d.id,
    ...d.data()
  }));

  // RANDOMIZE QUESTIONS
  questions = questions.sort(()=>Math.random()-0.5);

  showQuestion();
}

// ================= SHOW QUESTION =================
function showQuestion(){

  const q = questions[currentQuestion];

  document.getElementById("question").innerText = q.text;

  const html = `
  <label><input type="radio" name="opt" value="A"> ${q.optionA}</label><br>
  <label><input type="radio" name="opt" value="B"> ${q.optionB}</label><br>
  <label><input type="radio" name="opt" value="C"> ${q.optionC}</label><br>
  <label><input type="radio" name="opt" value="D"> ${q.optionD}</label>
  `;

  document.getElementById("options").innerHTML = html;

  document.getElementById("progress").innerText =
  `Question ${currentQuestion+1} of ${questions.length}`;
}

// ================= SAVE ANSWER =================
function saveAnswer(){

  const selected = document.querySelector('input[name="opt"]:checked');

  if(selected){
    answers[currentQuestion] = selected.value;
  }
}

// ================= NAVIGATION =================
function nextQuestion(){

  saveAnswer();

  if(currentQuestion < questions.length-1){
    currentQuestion++;
    showQuestion();
  }
}

function prevQuestion(){

  saveAnswer();

  if(currentQuestion > 0){
    currentQuestion--;
    showQuestion();
  }
}

// ================= TIMER =================
function startTimer(){

  clearInterval(state.timer);

  state.timer = setInterval(()=>{

    state.remaining--;

    const mins = Math.floor(state.remaining/60);
    const secs = state.remaining%60;

    document.getElementById("timer").innerText =
    `${mins}:${secs.toString().padStart(2,"0")}`;

    if(state.remaining <= 0){
      clearInterval(state.timer);
      submitExam();
    }

  },1000);
}

// ================= START TEST =================
async function startTest(){

  const pin = document.getElementById("pinCode").value.trim();

  if(!pin) return alert("Enter PIN");

  const ref = doc(db,"system","masterCode");
  const snap = await getDoc(ref);

  if(!snap.exists()) return alert("System error");

  const activePin = snap.data().activeCode;

  if(pin !== activePin){
    return alert("Invalid PIN");
  }

  state.staff = {pin};

  document.getElementById("candidateForm").classList.add("hidden");
  document.getElementById("quiz").classList.remove("hidden");

  await loadQuestions();

  startTimer();
}

// ================= AUTO GRADING =================
function calculateScore(){

  let score = 0;

  questions.forEach((q,i)=>{

    if(answers[i] === q.correct){
      score++;
    }

  });

  return score;
}

// ================= SUBMIT EXAM =================
async function submitExam(){

  const score = calculateScore();

  await addDoc(collection(db,"results"),{
    score: score,
    total: questions.length,
    pin: state.staff.pin,
    submittedAt: new Date()
  });

  document.getElementById("quiz").classList.add("hidden");
  document.getElementById("result").classList.remove("hidden");

  document.getElementById("scoreText").innerText =
  `You scored ${score} out of ${questions.length}`;
}

// ================= ADMIN DASHBOARD =================
async function loadResultsDashboard(){

  const snapshot = await getDocs(collection(db,"results"));

  const results = snapshot.docs.map(d=>d.data());

  const scores = results.map(r=>r.score);

  const avg = scores.length
  ? scores.reduce((a,b)=>a+b,0)/scores.length
  : 0;

  document.getElementById("totalCandidates").innerText = results.length;
  document.getElementById("avgScore").innerText = Math.round(avg);

  document.getElementById("highScore").innerText = scores.length ? Math.max(...scores) : 0;
  document.getElementById("lowScore").innerText = scores.length ? Math.min(...scores) : 0;
}

// ================= EVENT BINDINGS =================
document.addEventListener("DOMContentLoaded",()=>{

  // ADMIN PAGE
  if(document.getElementById("loginBtn")){

    document.getElementById("loginBtn").onclick = adminLogin;
    document.getElementById("generatePinBtn").onclick = generatePIN;
    document.getElementById("savePinBtn").onclick = savePIN;

    document.getElementById("uploadBtn").onclick = ()=>{

      const file = document.getElementById("uploadCSV").files[0];

      if(!file){
        alert("Select CSV file");
        return;
      }

      uploadQuestionsCSV(file);
    };

  }

  // CANDIDATE PAGE
  if(document.getElementById("startBtn")){

    const startBtn = document.getElementById("startBtn");
    const agree = document.getElementById("agreeCheck");

    if(agree && startBtn){
      agree.addEventListener("change",()=>{
        startBtn.disabled = !agree.checked;
      });
    }

    startBtn.onclick = startTest;

    document.getElementById("nextBtn").onclick = nextQuestion;
    document.getElementById("prevBtn").onclick = prevQuestion;
    document.getElementById("submitBtn").onclick = submitExam;
  }

});
