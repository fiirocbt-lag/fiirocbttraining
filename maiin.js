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

// ================= LOCAL STORAGE (RESULTS ONLY) =================
const store = {
  getResults: () => JSON.parse(localStorage.getItem("results") || "[]"),
  setResults: (r) => localStorage.setItem("results", JSON.stringify(r))
};

// ================= APP STATE =================
let state = {
  remaining: 0,
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
  showAnalytics();
}

// ================= LOAD CURRENT PIN =================
async function loadCurrentPin() {
  const ref = doc(db, "system", "masterCode");
  const snap = await getDoc(ref);

  const list = document.getElementById("pinList");
  if (!list) return;

  if (snap.exists()) {
    list.innerHTML = `<li>${snap.data().activeCode}</li>`;
  } else {
    list.innerHTML = `<li>No Active PIN</li>`;
  }
}

// ================= GENERATE PIN =================
function generatePIN() {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  document.getElementById("newPin").value = pin;
}

// ================= SAVE PIN =================
async function savePIN() {
  const pin = document.getElementById("newPin").value.trim();
  if (!pin) return alert("Generate PIN first");

  const ref = doc(db, "system", "masterCode");
  const snap = await getDoc(ref);

  // Archive old PIN
  if (snap.exists()) {
    const old = snap.data();
    await addDoc(collection(db, "codeArchive"), {
      code: old.activeCode,
      createdAt: old.createdAt,
      expiredAt: new Date(),
      createdBy: old.createdBy || ""
    });
  }

  // Save new PIN
  await setDoc(ref, {
    activeCode: pin,
    createdAt: new Date(),
    createdBy: state.adminMeta.name
  });

  alert("New PIN saved. Old PIN expired.");
  loadCurrentPin();
}

// ================= CANDIDATE START =================
async function startTest() {

  const pinInput = document.getElementById("pinCode");
  if (!pinInput) return;

  const pin = pinInput.value.trim();
  if (!pin) return alert("Enter PIN");

  const ref = doc(db, "system", "masterCode");
  const snap = await getDoc(ref);

  if (!snap.exists()) return alert("System error");

  const activePin = String(snap.data().activeCode).trim();

  if (activePin !== pin) {
    return alert("Invalid or expired PIN.");
  }

  // PIN VALID
  state.staff = { pin };
  state.remaining = 60 * 60;

  const form = document.getElementById("candidateForm");
  const quiz = document.getElementById("quiz");

  if (form) form.classList.add("hidden");
  if (quiz) quiz.classList.remove("hidden");

  startTimer();
}

// ================= TIMER =================
function startTimer() {

  clearInterval(state.timer);

  state.timer = setInterval(() => {

    state.remaining--;

    const timerEl = document.getElementById("timer");

    if (timerEl) {
      const mins = Math.floor(state.remaining / 60);
      const secs = state.remaining % 60;
      timerEl.textContent = `${mins}:${secs.toString().padStart(2,"0")}`;
    }

    if (state.remaining <= 0) {
      clearInterval(state.timer);
      alert("Time up!");
    }

  }, 1000);
}

// ================= ANALYTICS =================
function showAnalytics() {

  const results = store.getResults();

  const total = document.getElementById("totalCandidates");
  const avgEl = document.getElementById("avgScore");

  if (!total || !avgEl) return;

  const scores = results.map(r => r.score);

  const avg = scores.length
    ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length)
    : 0;

  total.textContent = results.length;
  avgEl.textContent = avg;
}

// ================= EXPORT RESULTS =================
function exportResults() {

  const res = store.getResults();

  let csv = "Date,PIN,Score,Grade\n";

  res.forEach(r=>{
    csv += `${r.date},${r.pin},${r.score},${r.grade}\n`;
  });

  const blob = new Blob([csv]);

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "FIIRO_results.csv";
  a.click();
}

// ================= DOWNLOAD PIN ARCHIVE =================
async function downloadArchive() {

  const snapshot = await getDocs(collection(db,"codeArchive"));

  let csv = "Code,CreatedAt,ExpiredAt,CreatedBy\n";

  snapshot.forEach(docu=>{
    const d = docu.data();

    csv += `${d.code},${d.createdAt?.toDate()},${d.expiredAt?.toDate()},${d.createdBy}\n`;
  });

  const blob = new Blob([csv]);

  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "PIN_archive.csv";
  a.click();
}

// ================= EVENT BINDINGS =================
document.addEventListener("DOMContentLoaded", () => {

  // ADMIN PAGE
  if (document.getElementById("loginBtn")) {

    document.getElementById("loginBtn").onclick = adminLogin;
    document.getElementById("generatePinBtn").onclick = generatePIN;
    document.getElementById("savePinBtn").onclick = savePIN;
    document.getElementById("exportBtn").onclick = exportResults;
    document.getElementById("downloadAuditBtn").onclick = downloadArchive;
  }

  // CANDIDATE PAGE
  if (document.getElementById("startBtn")) {

    const startBtn = document.getElementById("startBtn");
    const agree = document.getElementById("agreeCheck");

    // Enable START only after instructions agreement
    if (agree && startBtn) {
      agree.addEventListener("change", () => {
        startBtn.disabled = !agree.checked;
      });
    }

    startBtn.onclick = startTest;
  }

});
