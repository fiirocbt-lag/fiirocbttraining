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

  // Always clear previous pins before saving new one
  localStorage.setItem("pins", JSON.stringify([pin]));
  renderPins();
  alert("New PIN saved. All previous PINs have been cleared.");
  logAudit("PIN_GENERATION", `New active PIN: ${pin}`);
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

// ======== LOAD QUESTIONS (built-in fallback) =========
async function loadQuestionsFromCSV() {
  // Embedded 60 questions (A + B)
  const builtInQuestions = `
Section,Question,A,B,C,D,Correct
A,Who is the current President of Nigeria?,Bola Tinubu,Muhammadu Buhari,Goodluck Jonathan,Yemi Osinbajo,A
A,In what year did Nigeria gain independence?,1956,1960,1963,1970,B
A,What is the capital city of Nigeria?,Lagos,Abuja,Kano,Port Harcourt,B
A,How many states are there in Nigeria?,30,32,36,37,C
A,Who composed the Nigerian national anthem?,Ben Odiase,Wole Soyinka,Chinua Achebe,Fela Kuti,A
A,What are the colors of the Nigerian flag?,Green and Yellow,Green and White,Red and White,Green and Blue,B
A,Who was Nigeria's first Prime Minister?,Nnamdi Azikiwe,Abubakar Tafawa Balewa,Obafemi Awolowo,Ahmadu Bello,B
A,When did Nigeria become a republic?,1959,1963,1966,1979,B
A,What is Nigeria's major source of revenue?,Tourism,Agriculture,Oil,Manufacturing,C
A,Which river is the longest in Nigeria?,River Benue,River Niger,River Ogun,River Kaduna,B
A,Who was the first military Head of State in Nigeria?,Yakubu Gowon,Aguiyi Ironsi,Murtala Mohammed,Olusegun Obasanjo,B
A,Which country shares the longest border with Nigeria?,Ghana,Niger Republic,Cameroon,Chad,B
A,What is the currency of Nigeria?,Naira,Dollar,Cedi,Pound,A
A,Which Nigerian city is known as the “Coal City”?,Ibadan,Enugu,Kaduna,Kano,B
A,Which Nigerian state is called the “Centre of Excellence”?,Kano,Lagos,Ogun,Oyo,B
A,What is the name of Nigeria’s upper legislative chamber?,House of Representatives,Senate,National Assembly,House of Lords,B
A,How many geopolitical zones are in Nigeria?,4,5,6,7,C
A,Who was the first civilian president of the Fourth Republic?,Olusegun Obasanjo,Umaru Musa Yar’Adua,Goodluck Jonathan,Muhammadu Buhari,A
A,Which Nigerian leader was assassinated in 1976?,Aguiyi Ironsi,Murtala Mohammed,Sani Abacha,Balewa,B
A,What year was the Nigerian civil war fought?,1965-1967,1967-1970,1971-1973,1980-1982,B
A,What is the motto of Nigeria?,Unity and Faith,Faith, Peace and Progress,Peace, Unity and Progress,Unity and Faith, Peace and Progress,D
A,Which Nigerian city is known for tin mining?,Jos,Kaduna,Ibadan,Kano,A
A,Who was the first female Speaker of the House of Representatives?,Patricia Etteh,Stella Oduah,Okonjo Iweala,Dora Akunyili,A
A,Which Nigerian organization conducts elections?,EFCC,INEC,NDLEA,NEMA,B
A,Which Nigerian university is the oldest?,UNILAG,UI,ABU,OAU,B
A,When was the Nigerian Naira introduced?,1959,1963,1973,1980,C
A,Which sea lies to the south of Nigeria?,Indian Ocean,Red Sea,Atlantic Ocean,Mediterranean Sea,C
A,Who is regarded as the father of Nigerian nationalism?,Obafemi Awolowo,Nnamdi Azikiwe,Ahmadu Bello,Herbert Macaulay,D
A,Which Nigerian state is famous for groundnut production?,Kano,Lagos,Benue,Ebonyi,A
A,What is the official language of Nigeria?,English,Hausa,Yoruba,Igbo,A
B,What is the normal retirement age in the Nigerian Public Service?,55 years,60 years,65 years,70 years,B
B,What does PSR stand for?,Public Service Regulation,Public Service Rules,Personnel Service Rules,Public Staff Regulations,B
B,Who appoints Permanent Secretaries?,President,Head of Service,Governor,Minister,B
B,When should an officer resume duty after leave?,At will,As scheduled,Within one month,Immediately after leave ends,D
B,An officer who overstays leave without permission is said to have?,Absconded,Resigned,Retired,Transferred,A
B,The Public Service is under which arm of government?,Legislature,Judiciary,Executive,Private,C
B,What is the purpose of the Public Service Rules?,To punish workers,To guide conduct and discipline,To promote politics,To reduce pay,B
B,What document contains duties of civil servants?,Civil Service Handbook,Public Service Rules,Code of Conduct,Staff Manual,B
B,Which body handles staff discipline?,FCSC,Head of Service,President,Minister,A
B,What does “Interdiction” mean in the PSR?,Temporary suspension pending investigation,Retirement,Demotion,Promotion,A
B,Which leave is granted for health reasons?,Annual leave,Study leave,Sick leave,Compassionate leave,C
B,How many months of maternity leave are granted?,2 months,3 months,4 months,6 months,C
B,Promotion in the Public Service is based mainly on?,Seniority,Performance and vacancies,Connection,Training,B
B,The normal working hours are?,6 hours,7 hours,8 hours,10 hours,C
B,Leave of absence may be granted for?,Personal business,Study or health,Political campaign,Travel,B
B,When may a civil servant be suspended?,When found guilty,During investigation,On vacation,After resignation,B
B,Who signs letters of appointment?,Permanent Secretary,President,Director,Supervisor,A
B,Retirement benefits include?,Bonus,Gratuity and Pension,Commission,Allowance,B
B,What must an officer do before traveling abroad?,Take annual leave,Seek approval,Buy ticket,Inform friends,B
B,What is the PSR’s stance on punctuality?,Optional,Mandatory,Not important,Only for seniors,B
B,Which form is used for leave application?,PSR Form 1,Leave Form 3,Annual Leave Form 1,Official Letter,B
B,How many days make a working week?,5,6,7,4,A
B,Who maintains discipline in Ministries?,Permanent Secretary,Director,Head of Service,Minister,A
B,What is the full meaning of FCSC?,Federal Civil Service Commission,Federal Civil Service Council,Foreign Civil Staff Commission,Financial Civil Service Commission,A
B,What should be done to improve performance?,Reward laziness,Encourage training,Ignore feedback,Delay promotion,B
B,Which rule regulates official correspondence?,PSR Chapter 9,PSR Chapter 3,PSR Chapter 7,PSR Chapter 5,B
B,Transfer means?,Promotion,Change of duty station,Retirement,Suspension,B
B,The PSR applies to?,Private workers,Public officers only,All Nigerian citizens,NGOs,B
B,Disciplinary action begins with?,Dismissal,Warning,Query,Suspension,C
B,Resignation requires?,Verbal notice,Written notice,No notice,Minister’s approval,B
B,Who prepares annual performance evaluation reports?,Clerk,Immediate Supervisor,Director,Colleague,B
B,The PSR promotes?,Indiscipline,Accountability,Corruption,Nepotism,B
B,Which value is NOT expected of civil servants?,Honesty,Impartiality,Corruption,Integrity,C
`;

  try {
    let text = localStorage.getItem("uploadedQuestions");
    if (!text || text.trim().length === 0) text = builtInQuestions;

    const rows = text
      .trim()
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const parts = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        return parts ? parts.map((p) => p.replace(/^"|"$/g, "").trim()) : [];
      });

    rows.shift();
    const parsed = rows
      .filter((r) => r.length >= 7)
      .map((r) => ({
        Section: r[0],
        Question: r[1],
        A: r[2],
        B: r[3],
        C: r[4],
        D: r[5],
        Correct: r[6].toUpperCase(),
      }));

    console.log(`✅ Loaded ${parsed.length} questions`);
    return parsed;
  } catch (err) {
    console.error("❌ Error loading questions:", err);
    return [];
  }
}

// ======== CANDIDATE FLOW =========
async function startTest() {
  const pin = document.getElementById("pinCode").value.trim();
  if (!pin) return alert("Please enter your PIN.");

  const validPins = JSON.parse(localStorage.getItem("pins") || "[]");
  if (!validPins.includes(pin)) return alert("Invalid or expired PIN.");

  const questions = await loadQuestionsFromCSV();
  if (!questions.length) return alert("No questions found.");

  const sectionA = questions.filter((q) => q.Section.toUpperCase() === "A");
  const sectionB = questions.filter((q) => q.Section.toUpperCase() === "B");

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

  document.getElementById("progress").textContent = `Section ${q.Section} — Question ${
    state.current + 1
  }`;
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
  let total = 0,
    correct = 0;
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

// ======== ADMIN UPLOAD QUESTIONS (PERSISTENT) =========
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
