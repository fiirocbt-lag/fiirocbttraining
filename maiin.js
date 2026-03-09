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
let timer = null;
let remainingTime = 3600;
let candidatePin = "";

// ================= START TEST =================
async function startTest() {

  const pinInput = document.getElementById("pinCode");
  const pin = pinInput.value.trim();

  if (!pin) {
    alert("Enter PIN");
    return;
  }

  const ref = doc(db, "system", "masterCode");
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("System error");
    return;
  }

  const activePin = snap.data().activeCode;

  if (pin !== activePin) {
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
async function loadQuestions() {

  const snapshot = await getDocs(collection(db, "questions"));

  if (snapshot.empty) {
    document.getElementById("question").innerText =
      "No questions available.";
    return;
  }

  questions = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // Randomize question order
  questions = questions.sort(() => Math.random() - 0.5);

  currentQuestion = 0;

  showQuestion();
}

// ================= DISPLAY QUESTION =================
function showQuestion() {

  const q = questions[currentQuestion];

  document.getElementById("question").innerText = q.text;

  const optionsHTML = `
  <label><input type="radio" name="opt" value="A"> ${q.optionA}</label><br>
  <label><input type="radio" name="opt" value="B"> ${q.optionB}</label><br>
  <label><input type="radio" name="opt" value="C"> ${q.optionC}</label><br>
  <label><input type="radio" name="opt" value="D"> ${q.optionD}</label>
  `;

  document.getElementById("options").innerHTML = optionsHTML;

  document.getElementById("progress").innerText =
    `Question ${currentQuestion + 1} of ${questions.length}`;
}

// ================= SAVE ANSWER =================
function saveAnswer() {

  const selected = document.querySelector('input[name="opt"]:checked');

  if (selected) {
    answers[currentQuestion] = selected.value;
  }
}

// ================= NEXT QUESTION =================
function nextQuestion() {

  saveAnswer();

  if (currentQuestion < questions.length - 1) {
    currentQuestion++;
    showQuestion();
  }
}

// ================= PREVIOUS QUESTION =================
function prevQuestion() {

  saveAnswer();

  if (currentQuestion > 0) {
    currentQuestion--;
    showQuestion();
  }
}

// ================= TIMER =================
function startTimer() {

  clearInterval(timer);

  timer = setInterval(() => {

    remainingTime--;

    const mins = Math.floor(remainingTime / 60);
    const secs = remainingTime % 60;

    document.getElementById("timer").innerText =
      `${mins}:${secs.toString().padStart(2,"0")}`;

    if (remainingTime <= 0) {
      clearInterval(timer);
      submitExam();
    }

  }, 1000);
}

// ================= CALCULATE SCORE =================
function calculateScore() {

  let score = 0;

  questions.forEach((q, i) => {
    if (answers[i] === q.correct) {
      score++;
    }
  });

  return score;
}

// ================= SUBMIT EXAM =================
async function submitExam() {

  clearInterval(timer);

  const score = calculateScore();

  await addDoc(collection(db, "results"), {
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
document.addEventListener("DOMContentLoaded", () => {

  const startBtn = document.getElementById("startBtn");
  const agree = document.getElementById("agreeCheck");

  if (agree && startBtn) {
    agree.addEventListener("change", () => {
      startBtn.disabled = !agree.checked;
    });
  }

  if (startBtn) startBtn.onclick = startTest;

  const nextBtn = document.getElementById("nextBtn");
  const prevBtn = document.getElementById("prevBtn");
  const submitBtn = document.getElementById("submitBtn");

  if (nextBtn) nextBtn.onclick = nextQuestion;
  if (prevBtn) prevBtn.onclick = prevQuestion;
  if (submitBtn) submitBtn.onclick = submitExam;

});
