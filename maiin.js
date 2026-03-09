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
let currentQuestion = 0;
let answers = {};
let timer = null;
let remainingTime = 3600;
let candidatePin = "";

// ================= ADMIN LOGIN =================
function adminLogin() {

  const pass = document.getElementById("adminPass").value.trim();
  const name = document.getElementById("adminName").value.trim();

  if (!name) {
    alert("Enter name");
    return;
  }

  if (pass !== "admin123") {
    alert("Wrong password");
    return;
  }

  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("adminPanel").classList.remove("hidden");

}

// ================= GENERATE PIN =================
function generatePIN() {

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

  alert("PIN saved");

}

// ================= CSV QUESTION UPLOAD =================
async function uploadCSV(file){

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

  alert("Questions uploaded successfully");

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

// ================= LOAD QUESTIONS =================
async function loadQuestions(){

  const snapshot = await getDocs(collection(db,"questions"));

  if(snapshot.empty){
    document.getElementById("question").innerText="No questions available";
    return;
  }

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

// ================= EVENT BINDINGS =================
document.addEventListener("DOMContentLoaded",()=>{

  // admin login
  const loginBtn = document.getElementById("loginBtn");
  if(loginBtn) loginBtn.onclick = adminLogin;

  const genBtn = document.getElementById("generatePinBtn");
  if(genBtn) genBtn.onclick = generatePIN;

  const saveBtn = document.getElementById("savePinBtn");
  if(saveBtn) saveBtn.onclick = savePIN;

  const uploadBtn = document.getElementById("uploadBtn");
  if(uploadBtn){
    uploadBtn.onclick = ()=>{
      const file = document.getElementById("uploadCSV").files[0];
      if(file) uploadCSV(file);
      else alert("Select CSV file");
    }
  }

  const agree = document.getElementById("agreeCheck");
  const startBtn = document.getElementById("startBtn");

  if(agree && startBtn){
    agree.addEventListener("change",()=>{
      startBtn.disabled = !agree.checked;
    });
  }

  if(startBtn) startBtn.onclick = startTest;

  const nextBtn = document.getElementById("nextBtn");
  if(nextBtn) nextBtn.onclick = nextQuestion;

  const prevBtn = document.getElementById("prevBtn");
  if(prevBtn) prevBtn.onclick = prevQuestion;

  const submitBtn = document.getElementById("submitBtn");
  if(submitBtn) submitBtn.onclick = submitExam;

});
