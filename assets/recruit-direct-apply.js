(() => {
  "use strict";

  const CONFIG = Object.freeze({
    enabled: true,
    endpoint: "https://script.google.com/macros/s/AKfycbzAAWxxBqoCOGGMgxtXPJekDEA7MLYz2MEvRI9g5cLX9Bnmx377ABZIdKXdMh9q_nE1/exec",
    timeoutMs: 12000
  });
  const form = document.getElementById("recruitForm");
  if (!form) return;

  const startedAt = new Date().toISOString();
  const params = new URLSearchParams(location.search);
  const jobMap = {
    contractor: "業務委託",
    "full-time": "正社員・契約社員",
    "part-time": "アルバイト・パート",
    training: "未経験研修枠"
  };
  const originJob = Object.hasOwn(jobMap, params.get("job")) ? params.get("job") : "general";
  const $ = id => document.getElementById(id);
  const safeToken = value => String(value || "").replace(/[^a-z0-9_./-]/gi, "").slice(0, 120);
  let startedEventSent = false;
  let submitInFlight = false;
  let submitSucceeded = false;

  function track(name, data = {}) {
    if (typeof gtag !== "function") return;
    gtag("event", name, {
      job_context: originJob,
      work_style: $("workStyle")?.value || "not_selected",
      experience_level: $("experience")?.value || "not_selected",
      ...data
    });
  }

  function submissionId() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    if (globalThis.crypto?.getRandomValues) {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      bytes[6] = (bytes[6] & 15) | 64;
      bytes[8] = (bytes[8] & 63) | 128;
      return [...bytes].map((value, index) => ([4, 6, 8, 10].includes(index) ? "-" : "") + value.toString(16).padStart(2, "0")).join("");
    }
    return "";
  }

  function replaceButton(id) {
    const current = $(id);
    if (!current) return null;
    const clean = current.cloneNode(true);
    current.replaceWith(clean);
    return clean;
  }

  function setupJobContext() {
    const value = jobMap[originJob];
    if (value && $("workStyle")) $("workStyle").value = value;
    if (!value) return;
    const note = document.createElement("p");
    note.className = "rp-direct-context";
    note.textContent = `「${value}」の募集要項から移動しました。希望する働き方を入力済みにしています。`;
    form.prepend(note);
  }

  function collapseOptionalFields() {
    const consent = form.querySelector(".rp-consent");
    const grid = form.querySelector(".rp-form-grid");
    if (!consent || !grid || $("recruitOptionalDetails")) return;
    const ids = ["availability", "visitDate", "source", "applicantMessage"];
    const optionalWrappers = ids.map(id => $(id)?.closest(".rp-field-full, div")).filter(Boolean);
    const skillWrapper = form.querySelector('input[name="skill"]')?.closest(".rp-field-full");
    if (skillWrapper) optionalWrappers.unshift(skillWrapper);

    const details = document.createElement("details");
    details.id = "recruitOptionalDetails";
    details.className = "rp-optional-details rp-field-full";
    const summary = document.createElement("summary");
    summary.textContent = "希望時間・対応メニュー・質問を追加する（任意）";
    const body = document.createElement("div");
    body.className = "rp-optional-body";
    [...new Set(optionalWrappers)].forEach(wrapper => body.append(wrapper));
    details.append(summary, body);
    grid.append(details);
  }

  function ensureHoneypot() {
    if ($("recruitWebsite")) return;
    const wrapper = document.createElement("div");
    wrapper.className = "rp-honeypot";
    wrapper.setAttribute("aria-hidden", "true");
    wrapper.innerHTML = '<label for="recruitWebsite">Website</label><input id="recruitWebsite" type="text" tabindex="-1" autocomplete="off" maxlength="120">';
    form.append(wrapper);
  }

  function setDirectState() {
    let state = $("recruitDirectState");
    if (!state) {
      state = document.createElement("p");
      state.id = "recruitDirectState";
      state.className = "rp-direct-state";
      form.querySelector(".rp-form-actions")?.insertAdjacentElement("beforebegin", state);
    }
    state.textContent = CONFIG.enabled
      ? "このサイトから直接送信できます。メールアプリを開く必要はありません。"
      : "現在はメールまたはLINEで送信できます。直接送信機能は公開前テスト中です。";
  }

  function selectedSkills() {
    return [...form.querySelectorAll('input[name="skill"]:checked')].map(input => input.value).join("、");
  }

  function getApplicationText() {
    return [
      "身悠晏 採用相談",
      "",
      `お名前：${$("applicantName").value.trim()}`,
      `希望連絡方法：${$("contactMethod").value}`,
      `連絡先：${$("contactValue").value.trim()}`,
      `施術経験：${$("experience").value}`,
      `希望する働き方：${$("workStyle").value}`,
      `対応できる施術：${selectedSkills() || "未記入"}`,
      `希望曜日・時間帯：${$("availability").value.trim() || "未記入"}`,
      `見学希望日：${$("visitDate").value || "未定"}`,
      `募集を知った場所：${$("source").value || "未記入"}`,
      `質問・相談内容：${$("applicantMessage").value.trim() || "なし"}`
    ].join("\n");
  }

  function validate() {
    const status = $("formStatus");
    const required = ["applicantName", "contactMethod", "contactValue", "experience", "workStyle"];
    const missing = required.find(id => !$(id)?.value.trim());
    if (missing) {
      $(missing).focus();
      status.textContent = "必須項目をご入力ください。";
      return false;
    }
    if ($("contactMethod").value === "メール" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test($("contactValue").value.trim())) {
      $("contactValue").focus();
      status.textContent = "連絡先に有効なメールアドレスをご入力ください。";
      return false;
    }
    if (!$("recruitConsent").checked) {
      $("recruitConsent").focus();
      status.textContent = "応募情報の利用目的への同意が必要です。";
      return false;
    }
    return true;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.append(area);
      area.select();
      const ok = document.execCommand("copy");
      area.remove();
      return ok;
    }
  }

  function openEmailFallback() {
    if (!validate()) return;
    const subject = encodeURIComponent(`【採用相談】${$("applicantName").value.trim()}様`);
    const body = encodeURIComponent(getApplicationText());
    track("recruit_apply_channel_click", { channel: "email" });
    location.href = `mailto:shinyuuan@gmail.com?subject=${subject}&body=${body}`;
    $("formStatus").textContent = "メールアプリを開きました。送信前に内容をご確認ください。";
  }

  function payload() {
    const utm = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content"].forEach(key => { utm[key] = safeToken(params.get(key)); });
    return {
      requestType: "recruit",
      name: $("applicantName").value.trim().slice(0, 60),
      contactMethod: $("contactMethod").value.slice(0, 20),
      contactValue: $("contactValue").value.trim().slice(0, 160),
      experience: $("experience").value.slice(0, 40),
      workStyle: $("workStyle").value.slice(0, 60),
      skills: selectedSkills().slice(0, 200),
      availability: $("availability").value.trim().slice(0, 200),
      visitDate: $("visitDate").value.slice(0, 10),
      source: $("source").value.slice(0, 80),
      message: $("applicantMessage").value.trim().slice(0, 500),
      originJob,
      originPage: location.pathname.slice(0, 120),
      ...utm,
      submissionId: submissionId(),
      startedAt,
      website: $("recruitWebsite")?.value.slice(0, 120) || ""
    };
  }

  async function submitDirect() {
    if (!CONFIG.enabled || !CONFIG.endpoint) {
      openEmailFallback();
      return;
    }
    if (submitSucceeded || submitInFlight || !validate()) return;
    const data = payload();
    if (!data.submissionId) {
      $("formStatus").textContent = "送信準備を完了できませんでした。メールまたはLINEをご利用ください。";
      return;
    }
    submitInFlight = true;
    directButton.disabled = true;
    $("formStatus").textContent = "採用相談を送信しています…";
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.timeoutMs);
    try {
      const response = await fetch(CONFIG.endpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        credentials: "omit",
        redirect: "follow",
        body: JSON.stringify(data),
        signal: controller.signal
      });
      const result = await response.json();
      if (result?.ok !== true) throw new Error("not accepted");
      submitSucceeded = true;
      directButton.textContent = "送信済み";
      $("formStatus").textContent = result.duplicate
        ? "同じ内容の相談はすでに受け付けています。確認後ご連絡します。"
        : "採用相談を受け付けました。内容を確認後、希望の方法でご連絡します。";
      track(result.duplicate ? "recruit_form_duplicate" : "recruit_form_submit_success", { channel: "web" });
    } catch (_) {
      directButton.disabled = false;
      $("formStatus").textContent = "直接送信できませんでした。入力内容は残っています。メールまたはLINEをご利用ください。";
      track("recruit_form_submit_error", { channel: "web" });
    } finally {
      clearTimeout(timer);
      submitInFlight = false;
    }
  }

  setupJobContext();
  collapseOptionalFields();
  ensureHoneypot();
  setDirectState();
  if ($("visitDate")) $("visitDate").min = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tokyo" });

  const directButton = replaceButton("emailApply");
  const lineButton = replaceButton("lineApply");
  const copyButton = replaceButton("copyApply");
  if (directButton) {
    directButton.textContent = CONFIG.enabled ? "このサイトから相談を送信" : "メールアプリで送る";
    directButton.addEventListener("click", submitDirect);
  }
  lineButton?.addEventListener("click", async () => {
    if (!validate()) return;
    const lineTab = window.open("about:blank", "_blank");
    const ok = await copyText(getApplicationText());
    track("recruit_apply_channel_click", { channel: "line" });
    $("formStatus").textContent = ok
      ? "応募内容をコピーしました。LINEのトーク画面に貼り付けて送信してください。"
      : "コピーできませんでした。「内容だけコピー」をお試しください。";
    if (ok && lineTab) {
      lineTab.opener = null;
      lineTab.location.href = "https://page.line.me/017hlpiu";
    } else if (lineTab) {
      lineTab.close();
    }
  });
  copyButton?.addEventListener("click", async () => {
    if (!validate()) return;
    const ok = await copyText(getApplicationText());
    track("recruit_apply_channel_click", { channel: "copy" });
    $("formStatus").textContent = ok
      ? "応募内容をコピーしました。LINEまたはメールへ貼り付けて送信してください。"
      : "コピーできませんでした。入力内容を手動でコピーしてください。";
  });

  form.addEventListener("input", () => {
    if (startedEventSent) return;
    startedEventSent = true;
    track("recruit_form_start");
  }, { once: true });
  track("recruit_form_view");

  const style = document.createElement("style");
  style.textContent = `
    .rp-direct-context,.rp-direct-state{margin:0 0 18px;padding:12px 14px;border-left:4px solid var(--rp-green);border-radius:8px;background:var(--rp-soft);color:var(--rp-green);font-size:.84rem;line-height:1.7}
    .rp-optional-details{grid-column:1/-1;border:1px solid var(--rp-line);border-radius:12px;background:#fbfdfc;overflow:hidden}
    .rp-optional-details summary{padding:14px 16px;cursor:pointer;color:var(--rp-green);font-weight:800}
    .rp-optional-body{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:4px 16px 18px}
    .rp-optional-body .rp-field-full{grid-column:1/-1}
    .rp-honeypot{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important}
    @media(max-width:640px){.rp-optional-body{grid-template-columns:1fr}.rp-optional-body .rp-field-full{grid-column:auto}}
  `;
  document.head.append(style);
})();
