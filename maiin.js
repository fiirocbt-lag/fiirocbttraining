// ================= FIREBASE =================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, addDoc,
  collection, getDocs, orderBy, query
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
let currentAdminName = "";
let currentAdminStaffID = "";


// ================= SHUFFLE =================
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}


// ================= AUDIT LOG =================
async function logAudit(action, details = {}) {
  try {
    await addDoc(collection(db, "auditLog"), {
      adminName: currentAdminName || "Unknown",
      staffID: currentAdminStaffID || "N/A",
      action,
      details,
      timestamp: new Date()
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}


// ================= ADMIN LOGIN =================
async function adminLogin() {
  const pass = document.getElementById("adminPass").value.trim();
  const name = document.getElementById("adminName").value.trim();
  const staffID = document.getElementById("adminStaffID").value.trim();
  const statusEl = document.getElementById("loginStatus");

  if (!name) { showStatus(statusEl, "Enter your name", "error"); return; }
  if (!pass) { showStatus(statusEl, "Enter your password", "error"); return; }

  // Check password from Firestore (falls back to "admin123" if not yet set)
  const pwSnap = await getDoc(doc(db, "system", "adminPassword"));
  const storedPassword = pwSnap.exists() ? pwSnap.data().password : "admin123";

  if (pass !== storedPassword) { showStatus(statusEl, "❌ Wrong password", "error"); return; }

  currentAdminName = name;
  currentAdminStaffID = staffID || "N/A";

  await logAudit("ADMIN_LOGIN", { staffID: currentAdminStaffID });

  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("adminPanel").classList.remove("hidden");

  await loadAnalytics();
  await loadCurrentPin();
  await loadAuditTable();
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
  if (!pin) { alert("Generate a PIN first"); return; }

  await setDoc(doc(db, "system", "masterCode"), {
    activeCode: pin,
    createdAt: new Date(),
    createdBy: currentAdminName,
    staffID: currentAdminStaffID
  });

  await logAudit("PIN_GENERATED", { pin, note: "Previous PIN replaced" });

  document.getElementById("activePinDisplay").textContent = pin;
  document.getElementById("activePinMeta").textContent =
    `Set by ${currentAdminName} on ${new Date().toLocaleString()}`;

  await loadAuditTable();
  alert("✅ PIN saved and activated");
}

async function loadCurrentPin() {
  try {
    const snap = await getDoc(doc(db, "system", "masterCode"));
    if (snap.exists()) {
      const d = snap.data();
      document.getElementById("activePinDisplay").textContent = d.activeCode || "—";
      const createdAt = d.createdAt
        ? new Date(d.createdAt.seconds * 1000).toLocaleString() : "Unknown";
      const by = d.createdBy || "Unknown";
      document.getElementById("activePinMeta").textContent = `Set by ${by} on ${createdAt}`;
    } else {
      document.getElementById("activePinDisplay").textContent = "No PIN set yet";
      document.getElementById("activePinMeta").textContent = "Generate and save a PIN below";
    }
  } catch (e) {
    console.error("Error loading PIN:", e);
  }
}


// ================= ANALYTICS =================
async function loadAnalytics() {
  const snapshot = await getDocs(collection(db, "results"));
  const results = snapshot.docs.map(d => d.data());
  const total = results.length;
  const percents = results.map(r => r.total > 0 ? Math.round((r.score / r.total) * 100) : 0);
  const passes = percents.filter(p => p >= 50).length;
  const avg = total > 0 ? Math.round(percents.reduce((a, b) => a + b, 0) / total) : 0;
  const high = total > 0 ? Math.max(...percents) : 0;
  const low = total > 0 ? Math.min(...percents) : 0;

  setText("totalCandidates", total);
  setText("avgScore", avg + "%");
  setText("highScore", high + "%");
  setText("lowScore", low + "%");
  setText("passCount", passes);
  setText("failCount", total - passes);
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}


// ================= AUDIT TABLE =================
async function loadAuditTable() {
  const tableBody = document.getElementById("auditTableBody");
  const countEl = document.getElementById("auditCount");
  if (!tableBody) return;

  try {
    const q = query(collection(db, "auditLog"), orderBy("timestamp", "desc"));
    const snapshot = await getDocs(q);
    const logs = snapshot.docs.map(d => d.data());

    if (countEl) countEl.textContent = logs.length;

    if (logs.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#8fa696;padding:24px;">No activity recorded yet</td></tr>`;
      return;
    }

    const actionLabels = {
      ADMIN_LOGIN: "🔐 Admin Login",
      PIN_GENERATED: "🔑 PIN Generated",
      QUESTIONS_UPLOADED: "📤 Questions Uploaded",
      RESULTS_EXPORTED: "📊 Results Exported",
      AUDIT_EXPORTED: "🗂 Audit Log Exported",
      PASSWORD_CHANGED: "🔒 Password Changed"
    };

    tableBody.innerHTML = logs.map(log => {
      const ts = log.timestamp
        ? new Date(log.timestamp.seconds * 1000).toLocaleString() : "Unknown";
      const label = actionLabels[log.action] || log.action;

      let detailStr = "—";
      if (log.action === "PIN_GENERATED" && log.details?.pin) {
        detailStr = `PIN: <strong style="font-family:monospace;letter-spacing:.1em">${log.details.pin}</strong>`;
      } else if (log.action === "QUESTIONS_UPLOADED") {
        detailStr = `${log.details?.count || 0} questions • ${log.details?.filename || ""}`;
      } else if (log.action === "ADMIN_LOGIN") {
        detailStr = "Logged in to admin panel";
      } else if (log.action === "RESULTS_EXPORTED") {
        detailStr = `${log.details?.recordCount || 0} records exported`;
      } else if (log.action === "AUDIT_EXPORTED") {
        detailStr = "Audit CSV downloaded";
      }

      const badgeClass = {
        ADMIN_LOGIN: "badge-login",
        PIN_GENERATED: "badge-pin",
        QUESTIONS_UPLOADED: "badge-upload",
        RESULTS_EXPORTED: "badge-export",
        AUDIT_EXPORTED: "badge-export",
        PASSWORD_CHANGED: "badge-pin"
      }[log.action] || "";

      return `<tr>
        <td style="white-space:nowrap;font-size:.83rem;color:#8fa696">${ts}</td>
        <td><strong>${log.adminName || "—"}</strong></td>
        <td style="color:#8fa696;font-size:.85rem">${log.staffID || "N/A"}</td>
        <td><span class="audit-badge ${badgeClass}">${label}</span></td>
        <td style="font-size:.88rem">${detailStr}</td>
      </tr>`;
    }).join("");

  } catch (e) {
    console.error("Audit load error:", e);
    tableBody.innerHTML = `<tr><td colspan="5" style="color:red;padding:16px;">
      Error loading logs. Make sure Firestore rules allow reads on "auditLog".
    </td></tr>`;
  }
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
        resolve(XLSX.utils.sheet_to_json(ws, { defval: "" }));
      };
      reader.readAsArrayBuffer(file);
    });
  }

  previewBtn.onclick = async () => {
    try {
      parsedRows = await parseFile();
      if (!parsedRows.length) { showStatus(statusEl, "No data found", "error"); return; }
      const cols = Object.keys(parsedRows[0]);
      let html = "<table><thead><tr>" + cols.map(c => `<th>${c}</th>`).join("") + "</tr></thead><tbody>";
      parsedRows.slice(0, 10).forEach(row => {
        html += "<tr>" + cols.map(c => `<td>${row[c]}</td>`).join("") + "</tr>";
      });
      html += "</tbody></table>";
      if (parsedRows.length > 10) html += `<p style="font-size:.82rem;color:#8fa696;padding:8px 12px">Showing 10 of ${parsedRows.length} rows</p>`;
      previewDiv.innerHTML = html;
      showStatus(statusEl, `✅ ${parsedRows.length} questions ready to upload`, "success");
    } catch (err) {
      showStatus(statusEl, "Error reading file: " + err, "error");
    }
  };

  uploadBtn.onclick = async () => {
    if (!parsedRows.length) { showStatus(statusEl, "Preview the file first", "error"); return; }
    showStatus(statusEl, "⏳ Uploading...", "");
    let uploaded = 0;
    const filename = fileInput.files[0]?.name || "unknown";

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
      if (q.text && q.section) { await addDoc(collection(db, "questions"), q); uploaded++; }
    }

    await logAudit("QUESTIONS_UPLOADED", { count: uploaded, filename });
    await loadAuditTable();
    showStatus(statusEl, `✅ ${uploaded} questions uploaded!`, "success");
  };
}


// ================= LOAD QUESTIONS (CANDIDATE) =================
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
  if (!list.length) { document.getElementById("question").innerText = "No questions found"; return; }

  const q = list[currentQuestion];
  const globalIndex = currentSection === "A" ? currentQuestion : sectionA.length + currentQuestion;
  const totalAll = sectionA.length + sectionB.length;

  setText("questionNumber", `Question ${currentQuestion + 1} of ${list.length}`);
  document.getElementById("question").innerText = q.text;

  const options = [
    { key: "A", text: q.optionA }, { key: "B", text: q.optionB },
    { key: "C", text: q.optionC }, { key: "D", text: q.optionD }
  ];

  document.getElementById("options").innerHTML = options.map(opt => `
    <div class="option">
      <label>
        <input type="radio" name="opt" value="${opt.key}" />
        <span class="option-letter">${opt.key}</span>
        <span class="option-text">${opt.text}</span>
      </label>
    </div>`).join("");

  const sectionLabel = currentSection === "A" ? "📖 Section A: Current Affairs" : "📜 Section B: PSR";
  setText("progress", `${sectionLabel} • Q ${currentQuestion + 1} / ${list.length}`);

  const bar = document.getElementById("progressBar");
  if (bar) bar.style.width = (((globalIndex + 1) / totalAll) * 100) + "%";

  const saved = answers[currentSection + "_" + currentQuestion];
  if (saved) {
    const radio = document.querySelector(`input[value="${saved}"]`);
    if (radio) radio.checked = true;
  }

  const timerEl = document.getElementById("timer");
  if (timerEl && remainingTime <= 300) timerEl.classList.add("warning");
}

function saveAnswer() {
  const sel = document.querySelector('input[name="opt"]:checked');
  if (sel) answers[currentSection + "_" + currentQuestion] = sel.value;
}

function nextQuestion() {
  saveAnswer();
  const list = currentSection === "A" ? sectionA : sectionB;
  if (currentQuestion < list.length - 1) { currentQuestion++; showQuestion(); }
  else if (currentSection === "A") {
    if (confirm("Section A complete! Proceed to Section B?")) {
      currentSection = "B"; currentQuestion = 0; showQuestion();
    }
  } else {
    if (confirm("Submit exam? This cannot be undone.")) submitExam();
  }
}

function prevQuestion() {
  saveAnswer();
  if (currentSection === "B" && currentQuestion === 0) {
    if (confirm("Go back to Section A?")) {
      currentSection = "A"; currentQuestion = sectionA.length - 1; showQuestion();
    }
    return;
  }
  if (currentQuestion > 0) { currentQuestion--; showQuestion(); }
}

function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    remainingTime--;
    const m = Math.floor(remainingTime / 60), s = remainingTime % 60;
    const el = document.getElementById("timer");
    if (el) {
      el.textContent = `${m}:${s.toString().padStart(2, "0")}`;
      if (remainingTime <= 300) el.classList.add("warning");
    }
    if (remainingTime <= 0) { clearInterval(timer); submitExam(); }
  }, 1000);
}

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

function calculateScore() {
  let scoreA = 0, scoreB = 0;
  sectionA.forEach((q, i) => { if (answers["A_" + i] === q.correct) scoreA++; });
  sectionB.forEach((q, i) => { if (answers["B_" + i] === q.correct) scoreB++; });
  return { scoreA, scoreB, total: scoreA + scoreB };
}

async function submitExam() {
  clearInterval(timer);
  const { scoreA, scoreB, total } = calculateScore();
  const totalQ = sectionA.length + sectionB.length;
  const percent = totalQ > 0 ? Math.round((total / totalQ) * 100) : 0;
  const passed = percent >= 50;

  await addDoc(collection(db, "results"), {
    pin: candidatePin, score: total, scoreA, scoreB,
    total: totalQ, percent, passed, submittedAt: new Date()
  });

  document.getElementById("quiz").classList.add("hidden");
  document.getElementById("result").classList.remove("hidden");

  const badge = document.getElementById("resultBadge");
  if (badge) { badge.textContent = passed ? "✅ PASS" : "❌ FAIL"; badge.className = "result-badge " + (passed ? "pass" : "fail"); }

  const ring = document.getElementById("scoreRing");
  if (ring) {
    const c = 2 * Math.PI * 65;
    ring.style.strokeDasharray = c;
    ring.style.strokeDashoffset = c;
    ring.classList.add(passed ? "pass" : "fail");
    setTimeout(() => { ring.style.strokeDashoffset = c - (percent / 100) * c; }, 100);
  }

  setText("scorePercent", percent + "%");
  setText("scoreText", `You scored ${total} out of ${totalQ}`);

  const pctA = sectionA.length > 0 ? Math.round((scoreA / sectionA.length) * 100) : 0;
  const pctB = sectionB.length > 0 ? Math.round((scoreB / sectionB.length) * 100) : 0;
  setText("sectionAScore", `${scoreA} / ${sectionA.length}`);
  setText("sectionBScore", `${scoreB} / ${sectionB.length}`);
  setText("sectionASub", `${pctA}% — Current Affairs`);
  setText("sectionBSub", `${pctB}% — Public Service Rules`);

  setTimeout(() => {
    const bA = document.getElementById("sectionABar"), bB = document.getElementById("sectionBBar");
    if (bA) bA.style.width = pctA + "%";
    if (bB) bB.style.width = pctB + "%";
  }, 300);

  const msgs = [
    [80, "🌟 Excellent performance! You have a strong command of the subject matter."],
    [60, "👍 Good effort! Review the topics you missed and you'll do even better."],
    [50, "✅ You passed! A bit more practice will help you improve your score."],
    [0,  "📚 Keep studying! Focus on Current Affairs and Public Service Rules to improve."]
  ];
  const msgEl = document.getElementById("performanceMsg");
  if (msgEl) msgEl.textContent = msgs.find(([min]) => percent >= min)[1];
}

async function exportResults() {
  const snapshot = await getDocs(collection(db, "results"));
  let csv = "PIN,Score,Total,%Achieved,Section A,Section B,Status,SubmittedAt\n";
  snapshot.forEach(d => {
    const r = d.data();
    const date = r.submittedAt ? new Date(r.submittedAt.seconds * 1000).toISOString().replace("T", " ").substring(0, 19) : "";
    const pct = r.total > 0 ? Math.round((r.score / r.total) * 100) : 0;
    csv += `${r.pin},${r.score},${r.total},${pct}%,${r.scoreA ?? "N/A"},${r.scoreB ?? "N/A"},${pct >= 50 ? "PASS" : "FAIL"},${date}\n`;
  });
  downloadCSV(csv, "cbt_results.csv");
  await logAudit("RESULTS_EXPORTED", { recordCount: snapshot.size });
  await loadAuditTable();
}

async function downloadAuditLog() {
  const q = query(collection(db, "auditLog"), orderBy("timestamp", "desc"));
  const snapshot = await getDocs(q);
  let csv = "Timestamp,Admin Name,Staff ID,Action,Details\n";
  snapshot.forEach(d => {
    const r = d.data();
    const ts = r.timestamp ? new Date(r.timestamp.seconds * 1000).toLocaleString() : "";
    const details = r.details ? JSON.stringify(r.details).replace(/,/g, ";") : "";
    csv += `"${ts}","${r.adminName || ""}","${r.staffID || ""}","${r.action || ""}","${details}"\n`;
  });
  downloadCSV(csv, "cbt_audit_log.csv");
  await logAudit("AUDIT_EXPORTED", {});
  await loadAuditTable();
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ================= CHANGE PASSWORD =================
async function changePassword() {
  const currentPw   = document.getElementById("currentPw").value.trim();
  const newPw       = document.getElementById("newPw").value.trim();
  const confirmPw   = document.getElementById("confirmPw").value.trim();
  const statusEl    = document.getElementById("pwChangeStatus");

  if (!currentPw || !newPw || !confirmPw) {
    showStatus(statusEl, "Please fill in all fields", "error"); return;
  }
  if (newPw.length < 6) {
    showStatus(statusEl, "New password must be at least 6 characters", "error"); return;
  }
  if (newPw !== confirmPw) {
    showStatus(statusEl, "New passwords do not match", "error"); return;
  }

  // Verify current password against Firestore
  const pwSnap = await getDoc(doc(db, "system", "adminPassword"));
  const storedPassword = pwSnap.exists() ? pwSnap.data().password : "admin123";

  if (currentPw !== storedPassword) {
    showStatus(statusEl, "❌ Current password is incorrect", "error"); return;
  }

  // Save new password
  await setDoc(doc(db, "system", "adminPassword"), {
    password: newPw,
    updatedAt: new Date(),
    updatedBy: currentAdminName
  });

  await logAudit("PASSWORD_CHANGED", { note: "Admin password updated" });
  await loadAuditTable();

  // Clear fields
  document.getElementById("currentPw").value = "";
  document.getElementById("newPw").value = "";
  document.getElementById("confirmPw").value = "";

  showStatus(statusEl, "✅ Password changed successfully", "success");
}


// ================= EVENTS =================
document.addEventListener("DOMContentLoaded", () => {
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

  const changePwBtn = document.getElementById("changePwBtn");
  if (changePwBtn) changePwBtn.onclick = changePassword;

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
