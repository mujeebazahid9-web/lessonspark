// LessonSpark - hybrid (on-device + cloud) lesson generator built with Firebase AI Logic.
// Hackathon: #BuildHybridAI 2026

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app.js";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-app-check.js";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  InferenceMode,
} from "https://www.gstatic.com/firebasejs/12.14.0/firebase-ai.js";

// ---- Firebase config (public web config for this project) ----
const firebaseConfig = {
  apiKey: "AIzaSyASxFzfnxV3IyNeW5FdVjYi_tuddon598U",
  authDomain: "lessonspark-13120.firebaseapp.com",
  projectId: "lessonspark-13120",
  storageBucket: "lessonspark-13120.firebasestorage.app",
  messagingSenderId: "611091364928",
  appId: "1:611091364928:web:40552015e0d3b42c4d73a5",
};

// ---- App Check (debug token, accepted by the hackathon rules) ----
// Register this exact token in Firebase console > App Check > Apps > Manage debug tokens.
self.FIREBASE_APPCHECK_DEBUG_TOKEN = "7414bdd2-af92-4261-902c-600e6858ae5b";

const app = initializeApp(firebaseConfig);
initializeAppCheck(app, {
  // In debug mode the SDK uses the debug token above instead of reCAPTCHA.
  provider: new ReCaptchaV3Provider("debug-placeholder-key"),
  isTokenAutoRefreshEnabled: true,
});

// ---- Firebase AI Logic ----
const ai = getAI(app, { backend: new GoogleAIBackend() });
const CLOUD_MODEL = "gemini-3.5-flash-lite";

// Gemini Nano (Chrome's on-device model) handles these output languages.
// Other languages (for example Urdu) go to the cloud model automatically.
const ON_DEVICE_LANGS = { English: "en", Spanish: "es" };
const RTL_LANGS = new Set(["Urdu", "Arabic"]);

function buildModel(language) {
  const code = ON_DEVICE_LANGS[language];
  if (code) {
    return getGenerativeModel(ai, {
      mode: InferenceMode.PREFER_ON_DEVICE,
      onDeviceParams: {
        createOptions: {
          expectedInputs: [{ type: "text", languages: ["en"] }],
          expectedOutputs: [{ type: "text", languages: [code] }],
        },
      },
      inCloudParams: { model: CLOUD_MODEL },
    });
  }
  return getGenerativeModel(ai, {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: { model: CLOUD_MODEL },
  });
}

// ---- Prompts ----
function buildPrompt(task, topic, grade, language) {
  const base =
    `You are a helpful assistant for school teachers. Topic: "${topic}". ` +
    `Students: Grade ${grade}. Write the whole answer in ${language}. ` +
    `Use plain text with short headings and no markdown symbols like ** or #. `;
  if (task === "quiz") {
    return (
      base +
      "Create a 5-question multiple-choice quiz. Give each question four options labelled A to D. " +
      "After the questions, add an Answer Key."
    );
  }
  if (task === "explain") {
    return (
      base +
      "Explain the topic in simple words for these students. Include 3 key points and one everyday example. " +
      "Keep it under 200 words."
    );
  }
  return (
    base +
    "Create a worksheet with 5 fill-in-the-blank sentences, 3 short-answer questions and 1 small activity. " +
    "After that, add an Answer Key."
  );
}

const TITLES = { quiz: "Quiz", explain: "Simple explanation", worksheet: "Worksheet" };

// ---- UI helpers ----
const $ = (id) => document.getElementById(id);
const buttons = document.querySelectorAll("button[data-task]");
let deviceModelStarted = false;

function showError(message) {
  const box = $("error");
  box.textContent = message;
  box.style.display = message ? "block" : "none";
}

function setBusy(busy) {
  buttons.forEach((b) => (b.disabled = busy));
}

async function checkDevice() {
  const chip = $("deviceChip");
  const note = $("deviceNote");
  try {
    if (!("LanguageModel" in self)) {
      chip.textContent = "On-device AI: not available in this browser";
      note.textContent = "Cloud AI will be used instead. For on-device AI, use desktop Google Chrome 139 or newer.";
      return;
    }
    const state = await self.LanguageModel.availability({
      expectedInputs: [{ type: "text", languages: ["en"] }],
      expectedOutputs: [{ type: "text", languages: ["en"] }],
    });
    if (state === "available") {
      chip.textContent = "On-device AI: ready (Gemini Nano)";
      chip.classList.remove("off");
    } else if (state === "downloadable" || state === "downloading") {
      chip.textContent = "On-device AI: will download on first use";
      note.textContent = "The first request may take a few minutes. Cloud AI is used meanwhile.";
    } else {
      chip.textContent = "On-device AI: not supported on this device";
      note.textContent = "Cloud AI will be used instead.";
    }
  } catch (err) {
    chip.textContent = "On-device AI: could not check";
    note.textContent = "Cloud AI will be used instead.";
  }
}

async function generate(task) {
  const topic = $("topic").value.trim();
  const grade = $("grade").value;
  const language = $("language").value;
  if (!topic) {
    $("topic").focus();
    showError("Please type a topic first.");
    return;
  }

  showError("");
  setBusy(true);
  $("copyBtn").disabled = true;
  $("printBtn").disabled = true;
  $("sourceChip").hidden = true;
  $("resultTitle").textContent = `${TITLES[task]}: ${topic} (Grade ${grade})`;
  const out = $("output");
  out.dir = RTL_LANGS.has(language) ? "rtl" : "ltr";
  out.textContent = "Creating your lesson...";

  try {
    const model = buildModel(language);

    // Must run after a user click. Starts the Gemini Nano download if needed.
    if (!deviceModelStarted && ON_DEVICE_LANGS[language] && typeof model.initializeDeviceModel === "function") {
      deviceModelStarted = true;
      try {
        model.initializeDeviceModel((p) => {
          if (/^(Creating|Downloading)/.test(out.textContent)) {
            out.textContent = `Downloading on-device model: ${Math.round(p * 100)}%`;
          }
        });
      } catch (e) {
        console.warn("On-device model could not start:", e);
      }
    }

    const result = await model.generateContent(buildPrompt(task, topic, grade, language));
    out.textContent = result.response.text();

    const src = result.response.inferenceSource;
    const chip = $("sourceChip");
    const onDevice = String(src).toLowerCase().replace(/[^a-z]/g, "").includes("ondevice");
    console.log("inferenceSource:", src);
    chip.textContent = onDevice ? "Answered on-device (Gemini Nano)" : "Answered in the cloud (Gemini)";
    chip.hidden = false;
    $("copyBtn").disabled = false;
    $("printBtn").disabled = false;
  } catch (err) {
    console.error(err);
    out.textContent = "";
    showError("Something went wrong:\n" + (err && err.message ? err.message : String(err)));
  } finally {
    setBusy(false);
  }
}

buttons.forEach((b) => b.addEventListener("click", () => generate(b.dataset.task)));
$("topic").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    generate("quiz");
  }
});
$("copyBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("output").textContent);
    $("copyBtn").textContent = "Copied";
    setTimeout(() => ($("copyBtn").textContent = "Copy"), 1500);
  } catch (e) {
    showError("Could not copy. Please select the text and copy it manually.");
  }
});
$("printBtn").addEventListener("click", () => window.print());

checkDevice();
