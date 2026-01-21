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

// ======== LOAD QUESTIONS (60 built-in) =========
async function loadQuestionsFromCSV() {
  const builtInQuestions = [
    // ---------- Section A ----------
    {Section:"A",Question:"Who is the current President of Nigeria?",A:"Bola Tinubu",B:"Muhammadu Buhari",C:"Goodluck Jonathan",D:"Yemi Osinbajo",Correct:"A"},
    {Section:"A",Question:"In what year did Nigeria gain independence?",A:"1956",B:"1960",C:"1963",D:"1970",Correct:"B"},
    {Section:"A",Question:"What is the capital city of Nigeria?",A:"Lagos",B:"Abuja",C:"Kano",D:"Port Harcourt",Correct:"B"},
    {Section:"A",Question:"How many states are there in Nigeria?",A:"30",B:"32",C:"36",D:"37",Correct:"C"},
    {Section:"A",Question:"Who composed the Nigerian national anthem?",A:"Ben Odiase",B:"Wole Soyinka",C:"Chinua Achebe",D:"Fela Kuti",Correct:"A"},
    {Section:"A",Question:"What are the colors of the Nigerian flag?",A:"Green and Yellow",B:"Green and White",C:"Red and White",D:"Green and Blue",Correct:"B"},
    {Section:"A",Question:"Who was Nigeria's first Prime Minister?",A:"Nnamdi Azikiwe",B:"Abubakar Tafawa Balewa",C:"Obafemi Awolowo",D:"Ahmadu Bello",Correct:"B"},
    {Section:"A",Question:"When did Nigeria become a republic?",A:"1959",B:"1963",C:"1966",D:"1979",Correct:"B"},
    {Section:"A",Question:"What is Nigeria's major source of revenue?",A:"Tourism",B:"Agriculture",C:"Oil",D:"Manufacturing",Correct:"C"},
    {Section:"A",Question:"Which river is the longest in Nigeria?",A:"River Benue",B:"River Niger",C:"River Ogun",D:"River Kaduna",Correct:"B"},
    {Section:"A",Question:"Who was the first military Head of State in Nigeria?",A:"Yakubu Gowon",B:"Aguiyi Ironsi",C:"Murtala Mohammed",D:"Olusegun Obasanjo",Correct:"B"},
    {Section:"A",Question:"Which country shares the longest border with Nigeria?",A:"Ghana",B:"Niger Republic",C:"Cameroon",D:"Chad",Correct:"B"},
    {Section:"A",Question:"What is the currency of Nigeria?",A:"Naira",B:"Dollar",C:"Cedi",D:"Pound",Correct:"A"},
    {Section:"A",Question:"Which Nigerian city is known as the 'Coal City'?",A:"Ibadan",B:"Enugu",C:"Kaduna",D:"Kano",Correct:"B"},
    {Section:"A",Question:"Which Nigerian state is called the 'Centre of Excellence'?",A:"Kano",B:"Lagos",C:"Ogun",D:"Oyo",Correct:"B"},
    {Section:"A",Question:"What is the name of Nigeria’s upper legislative chamber?",A:"House of Reps",B:"Senate",C:"National Assembly",D:"House of Lords",Correct:"B"},
    {Section:"A",Question:"How many geopolitical zones are in Nigeria?",A:"4",B:"5",C:"6",D:"7",Correct:"C"},
    {Section:"A",Question:"Who was the first civilian president of the Fourth Republic?",A:"Olusegun Obasanjo",B:"Umaru Yar’Adua",C:"Goodluck Jonathan",D:"Muhammadu Buhari",Correct:"A"},
    {Section:"A",Question:"Which Nigerian leader was assassinated in 1976?",A:"Aguiyi Ironsi",B:"Murtala Mohammed",C:"Sani Abacha",D:"Balewa",Correct:"B"},
    {Section:"A",Question:"What year was the Nigerian civil war fought?",A:"1965-1967",B:"1967-1970",C:"1971-1973",D:"1980-1982",Correct:"B"},
    {Section:"A",Question:"What is the motto of Nigeria?",A:"Unity and Faith",B:"Faith, Peace and Progress",C:"Peace, Unity and Progress",D:"Unity and Faith, Peace and Progress",Correct:"D"},
    {Section:"A",Question:"Which Nigerian city is known for tin mining?",A:"Jos",B:"Kaduna",C:"Ibadan",D:"Kano",Correct:"A"},
    {Section:"A",Question:"Who was the first female Speaker of the House of Reps?",A:"Patricia Etteh",B:"Stella Oduah",C:"Okonjo Iweala",D:"Dora Akunyili",Correct:"A"},
    {Section:"A",Question:"Which organization conducts elections in Nigeria?",A:"EFCC",B:"INEC",C:"NDLEA",D:"NEMA",Correct:"B"},
    {Section:"A",Question:"Which Nigerian university is the oldest?",A:"UNILAG",B:"UI",C:"ABU",D:"OAU",Correct:"B"},
    {Section:"A",Question:"When was the Nigerian Naira introduced?",A:"1959",B:"1963",C:"1973",D:"1980",Correct:"C"},
    {Section:"A",Question:"Which sea lies to the south of Nigeria?",A:"Indian Ocean",B:"Red Sea",C:"Atlantic Ocean",D:"Mediterranean Sea",Correct:"C"},
    {Section:"A",Question:"Who is regarded as the father of Nigerian nationalism?",A:"Obafemi Awolowo",B:"Nnamdi Azikiwe",C:"Ahmadu Bello",D:"Herbert Macaulay",Correct:"D"},
    {Section:"A",Question:"Which Nigerian state is famous for groundnut production?",A:"Kano",B:"Lagos",C:"Benue",D:"Ebonyi",Correct:"A"},
    {Section:"A",Question:"What is the official language of Nigeria?",A:"English",B:"Hausa",C:"Yoruba",D:"Igbo",Correct:"A"},

    // ---------- Section B ----------
    {Section:"B",Question:"What is the normal retirement age in the Nigerian Public Service?",A:"55 years",B:"60 years",C:"65 years",D:"70 years",Correct:"B"},
    {Section:"B",Question:"What does PSR stand for?",A:"Public Service Regulation",B:"Public Service Rules",C:"Personnel Service Rules",D:"Public Staff Regulations",Correct:"B"},
    {Section:"B",Question:"Who appoints Permanent Secretaries?",A:"President",B:"Head of Service",C:"Governor",D:"Minister",Correct:"B"},
    {Section:"B",Question:"When should an officer resume duty after leave?",A:"At will",B:"As scheduled",C:"Within one month",D:"Immediately after leave ends",Correct:"D"},
    {Section:"B",Question:"An officer who overstays leave without permission is said to have what?",A:"Absconded",B:"Resigned",C:"Retired",D:"Transferred",Correct:"A"},
    {Section:"B",Question:"The Public Service is under which arm of government?",A:"Legislature",B:"Judiciary",C:"Executive",D:"Private",Correct:"C"},
    {Section:"B",Question:"What is the purpose of the Public Service Rules?",A:"To punish workers",B:"To guide conduct and discipline",C:"To promote politics",D:"To reduce pay",Correct:"B"},
    {Section:"B",Question:"Which document contains duties of civil servants?",A:"Civil Service Handbook",B:"Public Service Rules",C:"Code of Conduct",D:"Staff Manual",Correct:"B"},
    {Section:"B",Question:"Which body handles staff discipline?",A:"FCSC",B:"Head of Service",C:"President",D:"Minister",Correct:"A"},
    {Section:"B",Question:"What does 'Interdiction' mean in the PSR?",A:"Temporary suspension pending investigation",B:"Retirement",C:"Demotion",D:"Promotion",Correct:"A"},
    {Section:"B",Question:"Which leave is granted for health reasons?",A:"Annual leave",B:"Study leave",C:"Sick leave",D:"Compassionate leave",Correct:"C"},
    {Section:"B",Question:"How many months of maternity leave are granted?",A:"2",B:"3",C:"4",D:"6",Correct:"C"},
    {Section:"B",Question:"Promotion in the Public Service is based mainly on what?",A:"Seniority",B:"Performance and vacancies",C:"Connection",D:"Training",Correct:"B"},
    {Section:"B",Question:"The normal working hours are?",A:"6",B:"7",C:"8",D:"10",Correct:"C"},
    {Section:"B",Question:"Leave of absence may be granted for what?",A:"Personal business",B:"Study or health",C:"Political campaign",D:"Travel",Correct:"B"},
    {Section:"B",Question:"When may a civil servant be suspended?",A:"When found guilty",B:"During investigation",C:"On vacation",D:"After resignation",Correct:"B"},
    {Section:"B",Question:"Who signs letters of appointment?",A:"Permanent Secretary",B:"President",C:"Director",D:"Supervisor",Correct:"A"},
    {Section:"B",Question:"Retirement benefits include?",A:"Bonus",B:"Gratuity and Pension",C:"Commission",D:"Allowance",Correct:"B"},
    {Section:"B",Question:"What must an officer do before traveling abroad?",A:"Take annual leave",B:"Seek approval",C:"Buy ticket",D:"Inform friends",Correct:"B"},
    {Section:"B",Question:"What is the PSR’s stance on punctuality?",A:"Optional",B:"Mandatory",C:"Not important",D:"Only for seniors",Correct:"B"},
    {Section:"B",Question:"Which form is used for leave application?",A:"PSR Form 1",B:"Leave Form 3",C:"Annual Leave Form 1",D:"Official Letter",Correct:"B"},
    {Section:"B",Question:"How many days make a working week?",A:"5",B:"6",C:"7",D:"4",Correct:"A"},
    {Section:"B",Question:"Who maintains discipline in Ministries?",A:"Permanent Secretary",B:"Director",C:"Head of Service",D:"Minister",Correct:"A"},
    {Section:"B",Question:"What is the full meaning of FCSC?",A:"Federal Civil Service Commission",B:"Federal Civil Service Council",C:"Foreign Civil Staff Commission",D:"Financial Civil Service Commission",Correct:"A"},
    {Section:"B",Question:"What should be done to improve performance?",A:"Reward laziness",B:"Encourage training",C:"Ignore feedback",D:"Delay promotion",Correct:"B"},
    {Section:"B",Question:"Which rule regulates official correspondence?",A:"PSR Chapter 9",B:"PSR Chapter 3",C:"PSR Chapter 7",D:"PSR Chapter 5",Correct:"B"},
    {Section:"B",Question:"Transfer means what?",A:"Promotion",B:"Change of duty station",C:"Retirement",D:"Suspension",Correct:"B"},
    {Section:"B",Question:"The PSR applies to whom?",A:"Private workers",B:"Public officers only",C:"All citizens",D:"NGOs",Correct:"B"},
    {Section:"B",Question:"Disciplinary action begins with?",A:"Dismissal",B:"Warning",C:"Query",D:"Suspension",Correct:"C"},
    {Section:"B",Question:"Resignation requires what?",A:"Verbal notice",B:"Written notice",C:"No notice",D:"Minister’s approval",Correct:"B"},
    {Section:"B",Question:"Who prepares annual performance evaluation reports?",A:"Clerk",B:"Immediate Supervisor",C:"Director",D:"Colleague",Correct:"B"},
    {Section:"B",Question:"The PSR promotes what?",A:"Indiscipline",B:"Accountability",C:"Corruption",D:"Nepotism",Correct:"B"},
    {Section:"B",Question:"Which value is NOT expected of civil servants?",A:"Honesty",B:"Impartiality",C:"Corruption",D:"Integrity",Correct:"C"}
  ];

    console.log(`✅ Loaded ${builtInQuestions.length} questions`);
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

// ======== EXPORT, AUDIT, AND UPLOAD =========
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

