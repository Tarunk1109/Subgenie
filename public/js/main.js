// ─── Token (injected by server into window._authToken on protected pages) ──
function getToken() {
  return window._authToken || "";
}

// ─── Service Brand Colors ─────────────────────────────────────────────────────
const SERVICE_BRANDS = {
  netflix:              { bg: '#E50914', fg: '#fff' },
  spotify:              { bg: '#1DB954', fg: '#fff' },
  youtube:              { bg: '#FF0000', fg: '#fff' },
  'youtube premium':    { bg: '#FF0000', fg: '#fff' },
  'youtube tv':         { bg: '#FF0000', fg: '#fff' },
  'amazon prime':       { bg: '#00A8E0', fg: '#fff' },
  'amazon prime video': { bg: '#00A8E0', fg: '#fff' },
  amazon:               { bg: '#FF9900', fg: '#000' },
  'disney+':            { bg: '#113CCF', fg: '#fff' },
  'disney plus':        { bg: '#113CCF', fg: '#fff' },
  disney:               { bg: '#113CCF', fg: '#fff' },
  'apple tv+':          { bg: '#1c1c1e', fg: '#fff' },
  'apple tv':           { bg: '#1c1c1e', fg: '#fff' },
  'apple music':        { bg: '#fc3c44', fg: '#fff' },
  icloud:               { bg: '#3693F3', fg: '#fff' },
  apple:                { bg: '#1c1c1e', fg: '#fff' },
  hulu:                 { bg: '#1CE783', fg: '#000' },
  hbo:                  { bg: '#5822B4', fg: '#fff' },
  'hbo max':            { bg: '#5822B4', fg: '#fff' },
  max:                  { bg: '#002BE7', fg: '#fff' },
  paramount:            { bg: '#0064FF', fg: '#fff' },
  'paramount+':         { bg: '#0064FF', fg: '#fff' },
  peacock:              { bg: '#000', fg: '#fff' },
  adobe:                { bg: '#FF0000', fg: '#fff' },
  'adobe creative':     { bg: '#FF0000', fg: '#fff' },
  microsoft:            { bg: '#00A4EF', fg: '#fff' },
  'microsoft 365':      { bg: '#D83B01', fg: '#fff' },
  'office 365':         { bg: '#D83B01', fg: '#fff' },
  google:               { bg: '#4285F4', fg: '#fff' },
  'google one':         { bg: '#4285F4', fg: '#fff' },
  dropbox:              { bg: '#0061FF', fg: '#fff' },
  slack:                { bg: '#4A154B', fg: '#fff' },
  zoom:                 { bg: '#2D8CFF', fg: '#fff' },
  github:               { bg: '#24292E', fg: '#fff' },
  notion:               { bg: '#000', fg: '#fff' },
  figma:                { bg: '#F24E1E', fg: '#fff' },
  chatgpt:              { bg: '#10A37F', fg: '#fff' },
  openai:               { bg: '#10A37F', fg: '#fff' },
  claude:               { bg: '#d97757', fg: '#fff' },
  anthropic:            { bg: '#d97757', fg: '#fff' },
  linkedin:             { bg: '#0A66C2', fg: '#fff' },
  twitter:              { bg: '#1DA1F2', fg: '#fff' },
  x:                    { bg: '#000', fg: '#fff' },
  twitch:               { bg: '#9146FF', fg: '#fff' },
  discord:              { bg: '#5865F2', fg: '#fff' },
  duolingo:             { bg: '#58CC02', fg: '#fff' },
  headspace:            { bg: '#FF7A59', fg: '#fff' },
  calm:                 { bg: '#00B4D8', fg: '#fff' },
  audible:              { bg: '#F8991C', fg: '#000' },
  strava:               { bg: '#FC4C02', fg: '#fff' },
  peloton:              { bg: '#D4001F', fg: '#fff' },
  canva:                { bg: '#00C4CC', fg: '#fff' },
  grammarly:            { bg: '#15C39A', fg: '#fff' },
  '1password':          { bg: '#1A8CFF', fg: '#fff' },
  lastpass:             { bg: '#D32D27', fg: '#fff' },
  aha:                  { bg: '#e53e3e', fg: '#fff' },
};

function applyServiceBrands() {
  document.querySelectorAll('[data-service]').forEach(el => {
    const name = (el.dataset.service || '').toLowerCase().trim();
    let brand = SERVICE_BRANDS[name];
    if (!brand) {
      for (const [key, val] of Object.entries(SERVICE_BRANDS)) {
        if (name.includes(key) || key.includes(name)) {
          brand = val;
          break;
        }
      }
    }
    if (brand) {
      el.style.background = brand.bg;
      el.style.color = brand.fg;
      el.style.backgroundImage = 'none';
    }
  });
}

// ─── API helper ──────────────────────────────────────────────────────────────
async function apiCall(url, method = "GET", body = null) {
  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  return res.json();
}

// ─── Subscription CRUD ───────────────────────────────────────────────────────

function openAddModal() {
  const title = document.getElementById("modalTitle");
  const btn   = document.getElementById("modalSubmitBtn");
  const modal = document.getElementById("subModal");
  if (!modal) return;
  if (title) title.textContent = "Add Subscription";
  if (btn)   btn.textContent = "Add Subscription";
  document.getElementById("editSubId").value   = "";
  document.getElementById("subName").value     = "";
  document.getElementById("subCost").value     = "";
  document.getElementById("subCategory").value = "";
  document.getElementById("subCycle").value    = "monthly";
  clearModalErrors();
  modal.classList.remove("hidden");
}

function openEditModal(id, name, cost, category, cycle) {
  const title = document.getElementById("modalTitle");
  const btn   = document.getElementById("modalSubmitBtn");
  const modal = document.getElementById("subModal");
  if (!modal) return;
  if (title) title.textContent = "Edit Subscription";
  if (btn)   btn.textContent = "Save Changes";
  document.getElementById("editSubId").value   = id;
  document.getElementById("subName").value     = name;
  document.getElementById("subCost").value     = cost;
  document.getElementById("subCategory").value = category;
  document.getElementById("subCycle").value    = cycle;
  clearModalErrors();
  modal.classList.remove("hidden");
}

function closeModal() {
  const modal = document.getElementById("subModal");
  if (modal) modal.classList.add("hidden");
}

function clearModalErrors() {
  ["errName", "errCost", "errCategory"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });
}

async function handleSubscriptionForm(form) {
  clearModalErrors();

  const nameVal = document.getElementById("subName")?.value.trim();
  const costVal = document.getElementById("subCost")?.value;
  const catVal  = document.getElementById("subCategory")?.value.trim();
  let valid = true;

  if (!nameVal) {
    showFieldError("errName", "Name is required");
    valid = false;
  }
  if (!costVal || isNaN(Number(costVal)) || Number(costVal) < 0) {
    showFieldError("errCost", "Enter a valid cost (≥ 0)");
    valid = false;
  }
  if (!catVal) {
    showFieldError("errCategory", "Category is required");
    valid = false;
  }
  if (!valid) return;

  const id = document.getElementById("editSubId")?.value;
  const data = {
    name: nameVal,
    cost: Number(costVal),
    category: catVal,
    billingCycle: document.getElementById("subCycle")?.value || "monthly",
  };

  const btn = document.getElementById("modalSubmitBtn");
  if (btn) { btn.disabled = true; btn.textContent = "Saving…"; }

  try {
    const result = id
      ? await apiCall(`/api/subscriptions/${id}`, "PUT", data)
      : await apiCall("/api/subscriptions", "POST", data);

    if (result._id) {
      showToast(id ? "Subscription updated" : "Subscription added", "success");
      setTimeout(() => window.location.reload(), 600);
    } else {
      showToast(result.message || "Operation failed", "error");
      if (btn) { btn.disabled = false; btn.textContent = id ? "Save Changes" : "Add Subscription"; }
    }
  } catch {
    showToast("Network error", "error");
    if (btn) { btn.disabled = false; btn.textContent = id ? "Save Changes" : "Add Subscription"; }
  }
}

async function deleteSubscription(id) {
  if (!confirm("Delete this subscription and all its usage logs?")) return;
  const result = await apiCall(`/api/subscriptions/${id}`, "DELETE");
  if (result.message?.toLowerCase().includes("deleted")) {
    showToast("Subscription deleted", "success");
    setTimeout(() => window.location.reload(), 600);
  } else {
    showToast(result.message || "Failed to delete", "error");
  }
}

// ─── Usage Logs ──────────────────────────────────────────────────────────────

async function logUsage(subscriptionId) {
  const result = await apiCall("/api/usageLogs", "POST", {
    subscription: subscriptionId,
    action: "used",
  });
  if (result._id) {
    showToast("Usage logged ✓", "success");
    setTimeout(() => window.location.reload(), 700);
  } else {
    showToast(result.message || "Failed to log usage", "error");
  }
}

async function deleteUsageLog(id) {
  if (!confirm("Delete this usage entry?")) return;
  const result = await apiCall(`/api/usageLogs/${id}`, "DELETE");
  if (result.message?.toLowerCase().includes("deleted")) {
    showToast("Entry deleted", "success");
    setTimeout(() => window.location.reload(), 600);
  } else {
    showToast(result.message || "Failed to delete", "error");
  }
}

// ─── AI Suggestions ──────────────────────────────────────────────────────────

async function getAiSuggestions() {
  const btn       = document.getElementById("aiBtn");
  const container = document.getElementById("aiResults");
  if (!btn || !container) return;

  btn.disabled = true;
  btn.innerHTML = `
    <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-linecap="round"/>
    </svg> Analyzing…`;

  try {
    const data = await apiCall("/api/ai/suggestions");
    container.classList.remove("hidden");

    if (data.error) {
      container.innerHTML = `<div class="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">${data.error}</div>`;
      return;
    }

    const suggestions = data.suggestions || [];
    if (!suggestions.length) {
      container.innerHTML = `<div class="p-3 bg-slate-50 rounded-lg text-xs text-slate-500">No suggestions yet — add more subscriptions and usage data.</div>`;
      return;
    }

    let html = '<div class="space-y-2 mt-1">';
    suggestions.forEach((s, i) => {
      const savings = s.estimatedSavings
        ? `<span class="text-emerald-600 font-semibold text-xs">Save ~$${s.estimatedSavings}/mo</span>`
        : "";
      html += `
        <div class="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-100 animate-fade-in-up stagger-${Math.min(i+1,4)}">
          <div class="w-7 h-7 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">${i+1}</div>
          <div class="flex-1">
            <p class="text-sm font-semibold text-slate-800">${s.title || s.suggestion || ""}</p>
            <p class="text-xs text-slate-500 mt-0.5">${s.detail || s.reason || ""}</p>
          </div>
          <div>${savings}</div>
        </div>`;
    });
    html += "</div>";
    container.innerHTML = html;
  } catch {
    container.classList.remove("hidden");
    container.innerHTML = `<div class="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">Failed to get suggestions. Check your OpenAI API key.</div>`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg> Get Suggestions`;
  }
}

// ─── Alternatives Modal ───────────────────────────────────────────────────────

async function findAlternatives(subId, subName) {
  const modal   = document.getElementById("altModal");
  const content = document.getElementById("altContent");
  const nameEl  = document.getElementById("altSubName");
  if (!modal) return;

  if (nameEl) nameEl.textContent = `for ${subName}`;
  content.innerHTML = `
    <div class="flex items-center justify-center py-10 gap-3">
      <svg class="h-5 w-5 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-linecap="round"/>
      </svg>
      <span class="text-sm text-slate-500">Analyzing with AI…</span>
    </div>`;
  modal.classList.remove("hidden");

  try {
    const data = await apiCall(`/api/ai/alternatives/${subId}`);

    if (data.error) {
      content.innerHTML = `<div class="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">${data.error}</div>`;
      return;
    }

    const verdictStyles = {
      keep:      "bg-emerald-50 text-emerald-700 border border-emerald-200",
      downgrade: "bg-amber-50 text-amber-700 border border-amber-200",
      switch:    "bg-blue-50 text-blue-700 border border-blue-200",
      cancel:    "bg-rose-50 text-rose-700 border border-rose-200",
    };
    const verdictIcons = {
      keep: "✓", downgrade: "↓", switch: "⇄", cancel: "✕",
    };
    const vc = verdictStyles[data.verdict] || verdictStyles.keep;
    const vi = verdictIcons[data.verdict] || "•";

    let html = `
      <div class="mb-4 p-4 rounded-xl ${vc}">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-base font-bold">${vi}</span>
          <span class="text-sm font-bold capitalize">Verdict: ${data.verdict || "N/A"}</span>
        </div>
        <p class="text-xs leading-relaxed">${data.verdictReason || ""}</p>
      </div>`;

    const alts = data.alternatives || [];
    if (alts.length) {
      html += '<div class="space-y-3">';
      alts.forEach((alt) => {
        const price = alt.cost === 0
          ? `<span class="text-emerald-600 font-bold text-sm">Free</span>`
          : `<span class="font-bold text-slate-800">$${Number(alt.cost).toFixed(2)}</span><span class="text-slate-400 text-xs">/mo</span>`;
        html += `
          <div class="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-bold text-slate-800">${alt.name}</span>
              <span class="text-sm">${price}</span>
            </div>
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div><span class="text-emerald-600 font-semibold">Pros: </span><span class="text-slate-600">${alt.pros || "—"}</span></div>
              <div><span class="text-rose-500 font-semibold">Cons: </span><span class="text-slate-600">${alt.cons || "—"}</span></div>
            </div>
            ${alt.url ? `<a href="${alt.url}" target="_blank" rel="noopener noreferrer" class="inline-block mt-2 text-xs text-brand-600 hover:underline font-medium">Visit →</a>` : ""}
          </div>`;
      });
      html += "</div>";
    } else {
      html += `<p class="text-sm text-slate-500 text-center py-4">No alternatives found.</p>`;
    }

    content.innerHTML = html;
  } catch {
    content.innerHTML = `<div class="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">Failed to find alternatives.</div>`;
  }
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const icons = {
    success: `<svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`,
    error:   `<svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`,
    info:    `<svg class="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  };

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(-8px)";
    toast.style.transition = "opacity 0.3s, transform 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// ─── Field error ─────────────────────────────────────────────────────────────

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.remove("hidden"); }
}

// ─── Charts ──────────────────────────────────────────────────────────────────

function initCategoryChart(categoryData) {
  const canvas = document.getElementById("categoryChart");
  if (!canvas || !categoryData) return;

  const labels = Object.keys(categoryData);
  const values = Object.values(categoryData).map(v => parseFloat(v.toFixed(2)));
  if (!labels.length) return;

  const palette = [
    "#6366f1","#10b981","#f59e0b","#f43f5e",
    "#06b6d4","#8b5cf6","#ec4899","#14b8a6","#84cc16",
  ];

  new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: palette.slice(0, labels.length),
        borderWidth: 0,
        hoverOffset: 6,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            padding: 14,
            usePointStyle: true,
            pointStyleWidth: 8,
            font: { size: 11, family: "Inter" },
            color: "#64748b",
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => ` $${ctx.parsed.toFixed(2)}/mo`,
          },
        },
      },
    },
  });
}

function initBarChart(labels, values) {
  const canvas = document.getElementById("barChart");
  if (!canvas) return;

  const palette = [
    "#6366f1","#10b981","#f59e0b","#f43f5e",
    "#06b6d4","#8b5cf6","#ec4899","#14b8a6","#84cc16",
  ];

  new Chart(canvas, {
    type: "bar",
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: palette.slice(0, labels.length),
        borderRadius: 6,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` $${ctx.parsed.y.toFixed(2)}/mo`,
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { font: { size: 11, family: "Inter" }, color: "#94a3b8" },
        },
        y: {
          grid: { color: "#f1f5f9" },
          ticks: {
            font: { size: 11, family: "Inter" },
            color: "#94a3b8",
            callback: (v) => `$${v}`,
          },
          beginAtZero: true,
        },
      },
    },
  });
}

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  // Apply service brand colors to all subscription avatars
  applyServiceBrands();

  const subForm = document.getElementById("subscriptionForm");
  if (subForm) {
    subForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleSubscriptionForm(subForm);
    });
  }

  // Close modal on backdrop click
  const modal = document.getElementById("subModal");
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }
  const altModal = document.getElementById("altModal");
  if (altModal) {
    altModal.addEventListener("click", (e) => {
      if (e.target === altModal) altModal.classList.add("hidden");
    });
  }

  // ESC key closes modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      const am = document.getElementById("altModal");
      if (am) am.classList.add("hidden");
    }
  });
});
