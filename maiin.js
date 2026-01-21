// ======== DATA STORAGE =========
const store = {
  getUsers: () =>
    JSON.parse(localStorage.getItem("users") || '[{"pass":"admin123","role":"super"}]'),
  setUsers: (u) => localStorage.setItem("users", JSON.stringify(u)),
  getResults: () => JSON.parse(localStorage.getItem("results") || "[]"),
  setResults: (r) => localStorage.setItem("results", JSON.stringify(r)),
  getAudit: () => JSON.parse(localStorage.getItem("audit") || "[]"),
  setAudit: (a) => localStorage.setItem("audit", JSON.stringify(a)),
};

// ======== APP STATE =========
let state = {
  questions: [],
  currentSection: 0,
  current: 0,
  answers: {},
  remaining: 0,
  timer: null,
  staff: null,
  currentUser: null,
  adminMeta: null,
};

// ======== ADMIN LOGIN =========
function adminLogin() {
  const pass = document.getElementById("adminPass").value.trim();
  const name = document.getElementById("adminName").value.trim();
  const staffID = document.getElementById("adminStaffID").value.trim();

  if (!name) return alert("Please enter your name.");
  if (!pass) return alert("Please enter password.");

  const users = store.getUsers();
  const user = users.find((u) => u.pass === pass);
  if (!user)
    return (document.getElementById("loginStatus").textContent = "Wrong password.");

  state.currentUser = user;
  state.adminMeta = { name, staffID };
  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("adminPanel").classList.remove("hidden");

  logAudit("LOGIN", "Admin logged in");
  renderPins();
  showAnalytics();
}

// ======== AUDIT LOG =========
function logAudit(action, details = "") {
  const logs = store.getAudit();
  logs.push({
    time: new Date().toISOString(),
    admin: state.adminMeta?.name || "",
    staffID: state.adminMeta?.staffID || "",
    role: state.currentUser?.role || "",
    action,
    details,
  });
  store.setAudit(logs);
}

// ======== PIN MANAGEMENT =========
function generatePIN() {
  const pin = Math.floor(100000 + Math.random() * 900000).toString();
  document.getElementById("newPin").value = pin;
}
function savePIN() {
  const pin = document.getElementById("newPin").value.trim();
  if (!pin) return alert("Generate a PIN first.");

  localStorage.setItem("pins", JSON.stringify([pin]));
  renderPins();
  alert("New PIN saved. All previous PINs cleared.");
  logAudit("PIN_GENERATION", `New PIN: ${pin}`);
}
function renderPins() {
  const pins = JSON.parse(localStorage.getItem("pins") || "[]");
  const list = document.getElementById("pinList");
  list.innerHTML = pins.length ? `<li>${pins[0]}</li>` : "<li>No active PIN</li>";
}

// ======== ANALYTICS SUMMARY =========
function showAnalytics() {
  const results = store.getResults();
  if (!results.length) {
    document.getElementById("totalCandidates").textContent = 0;
    document.getElementById("avgScore").textContent = 0;
    document.getElementById("highScore").textContent = 0;
    document.getElementById("lowScore").textContent = 0;
    document.getElementById("passCount").textContent = 0;
    document.getElementById("failCount").textContent = 0;
    return;
  }
  const scores = results.map((r) => r.score);
  const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  const high = Math.max(...scores);
  const low = Math.min(...scores);
  const pass = results.filter((r) => r.score >= 50).length;
  const fail = results.length - pass;

  document.getElementById("totalCandidates").textContent = results.length;
  document.getElementById("avgScore").textContent = avg;
  document.getElementById("highScore").textContent = high;
  document.getElementById("lowScore").textContent = low;
  document.getElementById("passCount").textContent = pass;
  document.getElementById("failCount").textContent = fail;
}

// ======== LOAD QUESTIONS (5-demo) =========
async function loadQuestionsFromCSV() {
  // Simple 5-question demo (3 Current Affairs + 2 PSR)
  const builtInQuestions = [
    { Section: "A", Question: "Who is the current President of Nigeria?", A: "Bola Tinubu", B: "Muhammadu Buhari", C: "Goodluck Jonathan", D: "Yemi Osinbajo", Correct: "A" },
    { Section: "A", Question: "In what year did Nigeria gain independence?", A: "1956", B: "1960", C: "1963", D: "1970", Correct: "B" },
    { Section: "A", Question: "What is the capital city of Nigeria?", A: "Lagos", B: "Abuja", C: "Kano", D: "Port Harcourt", Correct: "B" },
    { Section: "B", Question: "What does PSR stand for?", A: "Public Service Regulation", B: "Public Service Rules", C: "Personnel Service Rules", D: "Public Staff Regulations", Correct: "B" },
    { Section: "B", Question: "What is the normal retirement age in the Nigerian Public Service?", A: "55 years", B: "60 years", C: "65 years", D: "70 years", Correct: "B" },
  ];

  console.log(`✅ Loaded ${builtInQuestions.length} built-in demo questions`);
  return builtInQuestions;
}

// ======== CANDIDATE FLOW =========
async function startTest() {
  const pin = document.getElementById("pinCode").value.trim();
  if (!pin) return alert("Please enter your PIN.");

  const validPins = JSON.parse(localStorage.getItem("pins") || "[]");
  if (!validPins.includes(pin)) return alert("Invalid or expired PIN.");

  const questions = await loadQuestionsFromCSV();
  if (!questions.length) return alert("No questions found.");

  const sectionA = questions.filter((q) => q.Section === "A");
  const sectionB = questions.filter((q) => q.Section === "B");

  state.questions = [sectionA, sectionB];
  state.staff = { pin };
  state.currentSection = 0;
  state.current = 0;
  state.answers = {};
  state.remaining = 60 * 60;

  document.getElementById("candidateForm").classList.add("hidden");
  document.getElementById("quiz").classList.remove("hidden");

  renderQuestion();
  startTimer();
}

function startTimer() {
  clearInterval(state.timer);
  state.timer = setInterval(() => {
    state.remaining--;
    const m = Math.floor(state.remaining / 60);
    const s = String(state.remaining % 60).padStart(2, "0");
    const timerEl = document.getElementById("timer");
    if (timerEl) timerEl.textContent = `Time: ${m}:${s}`;
    if (state.remaining <= 0) submitTest();
  }, 1000);
}

function renderQuestion() {
  const q = state.questions[state.currentSection][state.current];
  if (!q) return;

  document.getElementById("progress").textContent = `Section ${q.Section} — Question ${state.current + 1}`;
  document.getElementById("question").textContent = q.Question;

  const optBox = document.getElementById("options");
  optBox.innerHTML = "";
  ["A", "B", "C", "D"].forEach((opt) => {
    const btn = document.createElement("button");
    btn.textContent = `${opt}. ${q[opt]}`;
    if (state.answers[`${state.currentSection}-${state.current}`] === opt)
      btn.classList.add("selected");
    btn.onclick = () => {
      state.answers[`${state.currentSection}-${state.current}`] = opt;
      renderQuestion();
    };
    optBox.appendChild(btn);
  });
}

function nextQuestion() {
  const total = state.questions[state.currentSection].length;
  if (state.current < total - 1) state.current++;
  else if (state.currentSection === 0 && confirm("End of Section A. Begin Section B?")) {
    state.currentSection = 1;
    state.current = 0;
  } else if (state.currentSection === 1) submitTest();
  renderQuestion();
}

function prevQuestion() {
  if (state.current > 0) state.current--;
  renderQuestion();
}

function submitTest() {
  clearInterval(state.timer);
  let total = 0, correct = 0;
  state.questions.forEach((sec, s) =>
    sec.forEach((q, i) => {
      total++;
      if (state.answers[`${s}-${i}`] === q.Correct) correct++;
    })
  );

  const score = Math.round((correct / total) * 100) || 0;
  const grade = score >= 75 ? "Excellent" : score >= 50 ? "Pass" : "Fail";

  const rec = { date: new Date().toISOString(), pin: state.staff.pin, score, grade };
  const results = store.getResults();
  results.push(rec);
  store.setResults(results);

  document.getElementById("quiz").classList.add("hidden");
  document.getElementById("result").classList.remove("hidden");
  document.getElementById("scoreText").textContent = `Your score is ${score}% — ${grade}`;
  showAnalytics();
}

// ======== EXPORT & AUDIT =========
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

function downloadAudit() {
  const data = store.getAudit();
  let csv = "Time,Admin,StaffID,Role,Action,Details\n";
  data.forEach(
    (r) => (csv += `${r.time},${r.admin},${r.staffID},${r.role},${r.action},${r.details}\n`)
  );
  const blob = new Blob([csv]);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "FIIRO_admin_audit.csv";
  a.click();
}

// ======== ADMIN UPLOAD QUESTIONS =========
function handleUpload() {
  const fileInput = document.getElementById("uploadCSV");
  const status = document.getElementById("uploadStatus");
  const file = fileInput.files[0];
  if (!file) {
    status.textContent = "Please select a .csv file first.";
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    if (!text || text.trim().length === 0) {
      status.textContent = "❌ Empty file.";
      return;
    }
    localStorage.setItem("uploadedQuestions", text);
    status.textContent = "✅ Questions uploaded and saved!";
    logAudit("UPLOAD", "Admin uploaded new questions CSV");
  };
  reader.readAsText(file);
}

// ======== EVENT HOOKS =========
document.addEventListener("DOMContentLoaded", () => {
  const agree = document.getElementById("agreeCheck");
  const startBtn = document.getElementById("startBtn");
  if (agree && startBtn)
    agree.addEventListener("change", () => (startBtn.disabled = !agree.checked));

  if (startBtn) {
    startBtn.onclick = startTest;
    document.getElementById("prevBtn").onclick = prevQuestion;
    document.getElementById("nextBtn").onclick = nextQuestion;
    document.getElementById("submitBtn").onclick = submitTest;
    document.getElementById("restartBtn").onclick = () => location.reload();
  }

  if (document.getElementById("loginBtn")) {
    document.getElementById("loginBtn").onclick = adminLogin;
    document.getElementById("generatePinBtn").onclick = generatePIN;
    document.getElementById("savePinBtn").onclick = savePIN;
    document.getElementById("exportBtn").onclick = exportResults;
    document.getElementById("downloadAuditBtn").onclick = downloadAudit;
    document.getElementById("uploadBtn").onclick = handleUpload;
  }

  if (document.getElementById("adminPanel")) showAnalytics();
});
