// ================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, addDoc, collection, getDocs
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
let questions = [];
let sectionA = [];
let sectionB = [];
let answers = {};
let currentQuestion = 0;
let currentSection = "A";
let timer;
let remainingTime = 3600;
let candidatePin = "";


// ================= SHUFFLE =================
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}


// ================= ADMIN LOGIN =================
function adminLogin() {
  const pass = document.getElementById("adminPass").value.trim();
  const name = document.getElementById("adminName").value.trim();
  const statusEl = document.getElementById("loginStatus");

  if (!name) { showStatus(statusEl, "Enter your name", "error"); return; }
  if (pass !== "admin123") { showStatus(statusEl, "Wrong password", "error"); return; }

  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("adminPanel").classList.remove("hidden");
  loadAnalytics();
}

function showStatus(el, msg, type) {
  if (!el) return;
  el.textContent = msg;
  el.className = "status " + type;
}


// ================= PIN =================
function generatePIN() {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  document.getElementById("newPin").value = pin;
}

async function savePIN() {
  const pin = document.getElementById("newPin").value.trim();
  if (!pin) { alert("Generate PIN first"); return; }

  await setDoc(doc(db, "system", "masterCode"), {
    activeCode: pin,
    createdAt: new Date()
  });
  alert("✅ PIN saved successfully");
}


// ================= ANALYTICS =================
async function loadAnalytics() {
  const snapshot = await getDocs(collection(db, "results"));
  const results = snapshot.docs.map(d => d.data());

  const total = results.length;
  const percents = results.map(r => r.total > 0 ? Math.round((r.score / r.total) * 100) : 0);
  const passes = percents.filter(p => p >= 50).length;
  const fails = total - passes;
  const avg = total > 0 ? Math.round(percents.reduce((a, b) => a + b, 0) / total) : 0;
  const high = total > 0 ? Math.max(...percents) : 0;
  const low = total > 0 ? Math.min(...percents) : 0;

  setText("totalCandidates", total);
  setText("avgScore", avg + "%");
  setText("highScore", high + "%");
  setText("lowScore", low + "%");
  setText("passCount", passes);
  setText("failCount", fails);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}


// ================= EXCEL UPLOAD =================
function setupExcelUpload() {
  const fileInput = document.getElementById("excelFile");
  const previewBtn = document.getElementById("previewExcelBtn");
  const uploadBtn = document.getElementById("uploadExcelBtn");
  const statusEl = document.getElementById("uploadStatus");
  const previewDiv = document.getElementById("excelPreview");

  let parsedRows = [];

  function parseFile() {
    return new Promise((resolve, reject) => {
      const file = fileInput.files[0];
      if (!file) { reject("No file selected"); return; }

      const reader = new FileReader();
      reader.onload = e => {
        const wb = XLSX.read(e.target.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
        resolve(rows);
      };
      reader.readAsArrayBuffer(file);
    });
  }

  previewBtn.onclick = async () => {
    try {
      parsedRows = await parseFile();
      if (parsedRows.length === 0) { showStatus(statusEl, "No data found in file", "error"); return; }

      const cols = Object.keys(parsedRows[0]);
      let html = "<table><thead><tr>" + cols.map(c => `<th>${c}</th>`).join("") + "</tr></thead><tbody>";
      parsedRows.slice(0, 10).forEach(row => {
        html += "<tr>" + cols.map(c => `<td>${row[c]}</td>`).join("") + "</tr>";
      });
      html += "</tbody></table>";
      if (parsedRows.length > 10) html += `<p style="font-size:0.82rem;color:#8fa696;padding:8px 12px;">Showing 10 of ${parsedRows.length} rows</p>`;
      previewDiv.innerHTML = html;
      showStatus(statusEl, `✅ ${parsedRows.length} questions ready to upload`, "success");
    } catch (err) {
      showStatus(statusEl, "Error reading file: " + err, "error");
    }
  };

  uploadBtn.onclick = async () => {
    if (parsedRows.length === 0) {
      showStatus(statusEl, "Preview the file first", "error"); return;
    }

    showStatus(statusEl, "⏳ Uploading...", "");
    let uploaded = 0;

    for (const row of parsedRows) {
      const q = {
        section: String(row["Section"] || row["section"] || "").trim().toUpperCase(),
        text: String(row["Question"] || row["question"] || "").trim(),
        optionA: String(row["A"] || "").trim(),
        optionB: String(row["B"] || "").trim(),
        optionC: String(row["C"] || "").trim(),
        optionD: String(row["D"] || "").trim(),
        correct: String(row["Correct"] || row["correct"] || "").trim().toUpperCase()
      };

      if (q.text && q.section) {
        await addDoc(collection(db, "questions"), q);
        uploaded++;
      }
    }

    showStatus(statusEl, `✅ ${uploaded} questions uploaded successfully!`, "success");
  };
}


// ================= LOAD QUESTIONS =================
async function loadQuestions() {
  const snapshot = await getDocs(collection(db, "questions"));
  questions = snapshot.docs.map(d => d.data());

  sectionA = shuffle(questions.filter(q => q.section === "A"));
  sectionB = shuffle(questions.filter(q => q.section === "B"));

  currentSection = "A";
  currentQuestion = 0;
  showQuestion();
}


// ================= SHOW QUESTION =================
function showQuestion() {
  const list = currentSection === "A" ? sectionA : sectionB;

  if (list.length === 0) {
    document.getElementById("question").innerText = "No questions found";
    return;
  }

  const q = list[currentQuestion];
  const globalIndex = currentSection === "A"
    ? currentQuestion
    : sectionA.length + currentQuestion;
  const totalAll = sectionA.length + sectionB.length;

  // question number label
  const numEl = document.getElementById("questionNumber");
  if (numEl) numEl.textContent = `Question ${currentQuestion + 1} of ${list.length}`;

  document.getElementById("question").innerText = q.text;

  const options = [
    { key: "A", text: q.optionA },
    { key: "B", text: q.optionB },
    { key: "C", text: q.optionC },
    { key: "D", text: q.optionD }
  ];

  shuffle(options);

  let html = "";
  options.forEach(opt => {
    html += `
      <div class="option">
        <label>
          <input type="radio" name="opt" value="${opt.key}" />
          <span class="option-letter">${opt.key}</span>
          <span class="option-text">${opt.text}</span>
        </label>
      </div>`;
  });

  document.getElementById("options").innerHTML = html;

  // section chip in progress
  const sectionLabel = currentSection === "A" ? "📖 Section A: Current Affairs" : "📜 Section B: PSR";
  document.getElementById("progress").textContent = `${sectionLabel} • Q ${currentQuestion + 1} / ${list.length}`;

  // progress bar
  const bar = document.getElementById("progressBar");
  if (bar) bar.style.width = (((globalIndex + 1) / totalAll) * 100) + "%";

  // restore saved answer
  const saved = answers[currentSection + "_" + currentQuestion];
  if (saved) {
    const radio = document.querySelector(`input[value="${saved}"]`);
    if (radio) radio.checked = true;
  }

  // timer warning under 5 mins
  const timerEl = document.getElementById("timer");
  if (timerEl && remainingTime <= 300) timerEl.classList.add("warning");
}


// ================= SAVE ANSWER =================
function saveAnswer() {
  const selected = document.querySelector('input[name="opt"]:checked');
  if (selected) answers[currentSection + "_" + currentQuestion] = selected.value;
}


// ================= NEXT =================
function nextQuestion() {
  saveAnswer();
  const list = currentSection === "A" ? sectionA : sectionB;

  if (currentQuestion < list.length - 1) {
    currentQuestion++;
    showQuestion();
  } else {
    if (currentSection === "A") {
      if (confirm("Section A complete! Proceed to Section B?")) {
        currentSection = "B";
        currentQuestion = 0;
        showQuestion();
      }
    } else {
      if (confirm("Submit exam? This cannot be undone.")) submitExam();
    }
  }
}


// ================= PREVIOUS =================
function prevQuestion() {
  saveAnswer();
  if (currentSection === "B" && currentQuestion === 0) {
    if (confirm("Go back to Section A?")) {
      currentSection = "A";
      currentQuestion = sectionA.length - 1;
      showQuestion();
    }
    return;
  }
  if (currentQuestion > 0) { currentQuestion--; showQuestion(); }
}


// ================= TIMER =================
function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    remainingTime--;
    const mins = Math.floor(remainingTime / 60);
    const secs = remainingTime % 60;
    const timerEl = document.getElementById("timer");
    if (timerEl) {
      timerEl.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
      if (remainingTime <= 300) timerEl.classList.add("warning");
    }
    if (remainingTime <= 0) { clearInterval(timer); submitExam(); }
  }, 1000);
}


// ================= START TEST =================
async function startTest() {
  const pin = document.getElementById("pinCode").value.trim();
  if (!pin) { alert("Enter your PIN"); return; }

  const snap = await getDoc(doc(db, "system", "masterCode"));
  if (!snap.exists()) { alert("System error: no PIN configured"); return; }
  if (pin !== snap.data().activeCode) { alert("❌ Invalid PIN. Please contact the admin."); return; }

  candidatePin = pin;
  document.getElementById("candidateForm").classList.add("hidden");
  document.getElementById("quiz").classList.remove("hidden");

  await loadQuestions();
  startTimer();
}


// ================= SCORE =================
function calculateScore() {
  let scoreA = 0, scoreB = 0;

  sectionA.forEach((q, i) => { if (answers["A_" + i] === q.correct) scoreA++; });
  sectionB.forEach((q, i) => { if (answers["B_" + i] === q.correct) scoreB++; });

  return { scoreA, scoreB, total: scoreA + scoreB };
}


// ================= SUBMIT EXAM =================
async function submitExam() {
  clearInterval(timer);

  const { scoreA, scoreB, total } = calculateScore();
  const totalQ = sectionA.length + sectionB.length;
  const percent = totalQ > 0 ? Math.round((total / totalQ) * 100) : 0;
  const passed = percent >= 50;

  await addDoc(collection(db, "results"), {
    pin: candidatePin,
    score: total,
    scoreA, scoreB,
    total: totalQ,
    percent,
    passed,
    submittedAt: new Date()
  });

  document.getElementById("quiz").classList.add("hidden");
  document.getElementById("result").classList.remove("hidden");

  // Badge
  const badge = document.getElementById("resultBadge");
  if (badge) {
    badge.textContent = passed ? "✅ PASS" : "❌ FAIL";
    badge.className = "result-badge " + (passed ? "pass" : "fail");
  }

  // Score ring animation
  const ring = document.getElementById("scoreRing");
  if (ring) {
    const circumference = 2 * Math.PI * 65; // r=65
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = circumference;
    ring.classList.add(passed ? "pass" : "fail");
    setTimeout(() => {
      ring.style.strokeDashoffset = circumference - (percent / 100) * circumference;
    }, 100);
  }

  // Percentage
  const percentEl = document.getElementById("scorePercent");
  if (percentEl) percentEl.textContent = percent + "%";

  // Score text
  const scoreTextEl = document.getElementById("scoreText");
  if (scoreTextEl) scoreTextEl.textContent = `You scored ${total} out of ${totalQ}`;

  // Section A breakdown
  const pctA = sectionA.length > 0 ? Math.round((scoreA / sectionA.length) * 100) : 0;
  const pctB = sectionB.length > 0 ? Math.round((scoreB / sectionB.length) * 100) : 0;

  const elA = document.getElementById("sectionAScore");
  const elB = document.getElementById("sectionBScore");
  const subA = document.getElementById("sectionASub");
  const subB = document.getElementById("sectionBSub");
  const barA = document.getElementById("sectionABar");
  const barB = document.getElementById("sectionBBar");

  if (elA) elA.textContent = `${scoreA} / ${sectionA.length}`;
  if (elB) elB.textContent = `${scoreB} / ${sectionB.length}`;
  if (subA) subA.textContent = `${pctA}% — Current Affairs`;
  if (subB) subB.textContent = `${pctB}% — Public Service Rules`;
  setTimeout(() => {
    if (barA) barA.style.width = pctA + "%";
    if (barB) barB.style.width = pctB + "%";
  }, 300);

  // Performance message
  const msgEl = document.getElementById("performanceMsg");
  if (msgEl) {
    if (percent >= 80) msgEl.textContent = "🌟 Excellent performance! You have a strong command of the subject matter.";
    else if (percent >= 60) msgEl.textContent = "👍 Good effort! Review the topics you missed and you'll do even better.";
    else if (percent >= 50) msgEl.textContent = "✅ You passed! A bit more practice will help you improve your score.";
    else msgEl.textContent = "📚 Keep studying! Focus on Current Affairs and Public Service Rules to improve.";
  }
}


// ================= DOWNLOAD RESULTS =================
async function exportResults() {
  const snapshot = await getDocs(collection(db, "results"));
  let csv = "PIN,Score,Total,%Achieved,Section A,Section B,Status,SubmittedAt\n";

  snapshot.forEach(docu => {
    const d = docu.data();
    let date = "";
    if (d.submittedAt) {
      date = new Date(d.submittedAt.seconds * 1000).toISOString().replace("T", " ").substring(0, 19);
    }
    const percent = d.total > 0 ? Math.round((d.score / d.total) * 100) : 0;
    const status = percent >= 50 ? "PASS" : "FAIL";
    const sA = d.scoreA !== undefined ? d.scoreA : "N/A";
    const sB = d.scoreB !== undefined ? d.scoreB : "N/A";
    csv += `${d.pin},${d.score},${d.total},${percent}%,${sA},${sB},${status},${date}\n`;
  });

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "cbt_results.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}


// ================= AUDIT LOG =================
async function downloadAuditLog() {
  alert("Audit log feature coming soon.");
}


// ================= EVENTS =================
document.addEventListener("DOMContentLoaded", () => {

  // ADMIN PAGE
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) {
    loginBtn.onclick = adminLogin;
    document.getElementById("generatePinBtn").onclick = generatePIN;
    document.getElementById("savePinBtn").onclick = savePIN;
    setupExcelUpload();
  }

  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) exportBtn.onclick = exportResults;

  const auditBtn = document.getElementById("downloadAuditBtn");
  if (auditBtn) auditBtn.onclick = downloadAuditLog;

  // CANDIDATE PAGE
  const startBtn = document.getElementById("startBtn");
  if (startBtn) {
    const agree = document.getElementById("agreeCheck");
    agree.addEventListener("change", () => { startBtn.disabled = !agree.checked; });
    startBtn.onclick = startTest;
    document.getElementById("nextBtn").onclick = nextQuestion;
    document.getElementById("prevBtn").onclick = prevQuestion;
    document.getElementById("submitBtn").onclick = () => {
      if (confirm("Are you sure you want to submit your exam?")) submitExam();
    };
  }

  const restartBtn = document.getElementById("restartBtn");
  if (restartBtn) restartBtn.onclick = () => location.reload();
});
