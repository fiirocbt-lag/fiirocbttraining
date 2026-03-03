// ================= FIREBASE SETUP =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc,
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

// ================= LOCAL STORAGE (RESULTS + AUDIT ONLY) =================
const store = {
  getResults: () => JSON.parse(localStorage.getItem("results") || "[]"),
  setResults: (r) => localStorage.setItem("results", JSON.stringify(r)),
  getAudit: () => JSON.parse(localStorage.getItem("audit") || "[]"),
  setAudit: (a) => localStorage.setItem("audit", JSON.stringify(a)),
};

// ================= APP STATE =================
let state = {
  questions: [],
  currentSection: 0,
  current: 0,
  answers: {},
  remaining: 0,
  timer: null,
  staff: null,
  adminMeta: null,
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

// ================= MASTER PIN SYSTEM =================
async function loadCurrentPin() {
  const ref = doc(db, "system", "masterCode");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    document.getElementById("pinList").innerHTML =
      `<li>${snap.data().activeCode}</li>`;
  } else {
    document.getElementById("pinList").innerHTML =
      `<li>No Active PIN</li>`;
  }
}

function generatePIN() {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  document.getElementById("newPin").value = pin;
}

async function savePIN() {
  const pin = document.getElementById("newPin").value.trim();
  if (!pin) return alert("Generate PIN first");

  const ref = doc(db, "system", "masterCode");
  const snap = await getDoc(ref);

  if (snap.exists()) {
    const old = snap.data();
    await addDoc(collection(db, "codeArchive"), {
      code: old.activeCode,
      createdAt: old.createdAt,
      expiredAt: new Date(),
      createdBy: old.createdBy || ""
    });
  }

  await updateDoc(ref, {
    activeCode: pin,
    createdAt: new Date(),
    createdBy: state.adminMeta.name
  });

  alert("New PIN saved. Old PIN expired.");
  loadCurrentPin();
}

// ================= CANDIDATE START =================
async function startTest() {
  const pin = document.getElementById("pinCode").value.trim();
  if (!pin) return alert("Enter PIN");

  const ref = doc(db, "system", "masterCode");
  const snap = await getDoc(ref);

  if (!snap.exists()) return alert("System error");

  if (snap.data().activeCode !== pin)
    return alert("Invalid or expired PIN.");

  state.staff = { pin };
  state.remaining = 60 * 60;

  document.getElementById("candidateForm").classList.add("hidden");
  document.getElementById("quiz").classList.remove("hidden");

  startTimer();
}

// ================= TIMER =================
function startTimer() {
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.remaining--;
    if (state.remaining <= 0) submitTest();
  }, 1000);
}

// ================= ANALYTICS =================
function showAnalytics() {
  const results = store.getResults();
  const scores = results.map((r) => r.score);
  const avg = scores.length
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  document.getElementById("totalCandidates").textContent = results.length;
  document.getElementById("avgScore").textContent = avg;
}

// ================= EXPORT =================
function exportResults() {
  const res = store.getResults();
  let csv = "Date,PIN,Score,Grade\n";
  res.forEach((r) => (csv += `${r.date},${r.pin},${r.score},${r.grade}\n`));
  const blob = new Blob([csv]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "FIIRO_results.csv";
  a.click();
}

async function downloadArchive() {
  const snapshot = await getDocs(collection(db, "codeArchive"));
  let csv = "Code,CreatedAt,ExpiredAt,CreatedBy\n";

  snapshot.forEach((docu) => {
    const d = docu.data();
    csv += `${d.code},${d.createdAt?.toDate()},${d.expiredAt?.toDate()},${d.createdBy}\n`;
  });

  const blob = new Blob([csv]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "PIN_archive.csv";
  a.click();
}

// ================= EVENT LISTENERS =================
document.addEventListener("DOMContentLoaded", () => {

  if (document.getElementById("loginBtn")) {
    document.getElementById("loginBtn").onclick = adminLogin;
    document.getElementById("generatePinBtn").onclick = generatePIN;
    document.getElementById("savePinBtn").onclick = savePIN;
    document.getElementById("exportBtn").onclick = exportResults;
    document.getElementById("downloadAuditBtn").onclick = downloadArchive;
  }

  if (document.getElementById("startBtn")) {
    document.getElementById("startBtn").onclick = startTest;
  }

});
