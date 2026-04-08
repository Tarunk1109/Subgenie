function getToken() {
  const cookies = document.cookie.split(";").reduce((acc, c) => {
    const [k, v] = c.trim().split("=");
    acc[k] = v;
    return acc;
  }, {});
  return cookies.token || "";
}

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

// --- Subscription CRUD ---

function openAddModal() {
  document.getElementById("modalTitle").textContent = "Add Subscription";
  document.getElementById("modalSubmitBtn").textContent = "Add Subscription";
  document.getElementById("editSubId").value = "";
  document.getElementById("subName").value = "";
  document.getElementById("subCost").value = "";
  document.getElementById("subCategory").value = "";
  document.getElementById("subCycle").value = "monthly";
  document.getElementById("subModal").classList.remove("hidden");
}

function openEditModal(id, name, cost, category, cycle) {
  document.getElementById("modalTitle").textContent = "Edit Subscription";
  document.getElementById("modalSubmitBtn").textContent = "Save Changes";
  document.getElementById("editSubId").value = id;
  document.getElementById("subName").value = name;
  document.getElementById("subCost").value = cost;
  document.getElementById("subCategory").value = category;
  document.getElementById("subCycle").value = cycle;
  document.getElementById("subModal").classList.remove("hidden");
}

function closeModal() {
  document.getElementById("subModal").classList.add("hidden");
}

async function handleSubscriptionForm(form) {
  ["errName", "errCost", "errCategory"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  const nameVal = document.getElementById("subName").value.trim();
  const costVal = document.getElementById("subCost").value;
  const catVal = document.getElementById("subCategory").value.trim();
  let valid = true;

  if (!nameVal) {
    const el = document.getElementById("errName");
    if (el) { el.textContent = "Name is required"; el.classList.remove("hidden"); }
    valid = false;
  }
  if (!costVal || isNaN(Number(costVal)) || Number(costVal) < 0) {
    const el = document.getElementById("errCost");
    if (el) { el.textContent = "Enter a valid cost"; el.classList.remove("hidden"); }
    valid = false;
  }
  if (!catVal) {
    const el = document.getElementById("errCategory");
    if (el) { el.textContent = "Category is required"; el.classList.remove("hidden"); }
    valid = false;
  }
  if (!valid) return;

  const id = document.getElementById("editSubId").value;
  const data = {
    name: nameVal,
    cost: Number(costVal),
    category: catVal,
    billingCycle: document.getElementById("subCycle").value,
  };

  if (id) {
    const result = await apiCall(`/api/subscriptions/${id}`, "PUT", data);
    if (result._id) {
      window.location.reload();
    } else {
      showToast(result.message || "Failed to update", "error");
    }
  } else {
    const result = await apiCall("/api/subscriptions", "POST", data);
    if (result._id) {
      window.location.reload();
    } else {
      showToast(result.message || "Failed to add", "error");
    }
  }
}

async function deleteSubscription(id) {
  if (!confirm("Delete this subscription?")) return;
  const result = await apiCall(`/api/subscriptions/${id}`, "DELETE");
  if (result.message?.includes("deleted")) {
    window.location.reload();
  } else {
    showToast(result.message || "Failed to delete", "error");
  }
}

async function logUsage(subscriptionId) {
  const result = await apiCall("/api/usageLogs", "POST", {
    subscription: subscriptionId,
    action: "used",
  });
  if (result._id) {
    showToast("Usage logged", "success");
    setTimeout(() => window.location.reload(), 600);
  } else {
    showToast(result.message || "Failed to log usage", "error");
  }
}

async function deleteUsageLog(id) {
  if (!confirm("Delete this usage log?")) return;
  const result = await apiCall(`/api/usageLogs/${id}`, "DELETE");
  if (result.message?.includes("deleted")) {
    window.location.reload();
  } else {
    showToast(result.message || "Failed to delete", "error");
  }
}

// --- AI Suggestions ---

async function getAiSuggestions() {
  const btn = document.getElementById("aiBtn");
  const container = document.getElementById("aiResults");
  btn.disabled = true;
  btn.innerHTML = '<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-linecap="round"/></svg> Analyzing...';

  try {
    const data = await apiCall("/api/ai/suggestions");
    container.classList.remove("hidden");

    if (data.error) {
      container.innerHTML = `<div class="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700">${data.error}</div>`;
      return;
    }

    const suggestions = data.suggestions || [];
    if (suggestions.length === 0) {
      container.innerHTML = '<div class="p-3 bg-slate-50 rounded-md text-xs text-slate-500">No suggestions available. Add more subscriptions and usage data.</div>';
      return;
    }

    let html = '<div class="space-y-2">';
    suggestions.forEach((s) => {
      const savings = s.estimatedSavings ? `<span class="text-emerald-600 font-semibold">Save ~$${s.estimatedSavings}</span>` : '';
      html += `<div class="p-3 bg-white rounded-md border border-slate-200">
        <div class="flex items-start justify-between gap-2">
          <div>
            <p class="text-sm font-medium text-slate-800">${s.title || s.suggestion || ''}</p>
            <p class="text-xs text-slate-500 mt-0.5">${s.detail || s.reason || ''}</p>
          </div>
          <div class="text-xs whitespace-nowrap">${savings}</div>
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  } catch {
    container.classList.remove("hidden");
    container.innerHTML = '<div class="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700">Failed to get suggestions. Check your API key.</div>';
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg> Get Suggestions';
  }
}

// --- Compare Alternatives ---

async function findAlternatives(subId, subName) {
  const modal = document.getElementById("altModal");
  const content = document.getElementById("altContent");
  const nameEl = document.getElementById("altSubName");

  nameEl.textContent = `for ${subName}`;
  content.innerHTML = '<div class="flex items-center justify-center py-8"><svg class="h-5 w-5 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" stroke-dasharray="31.4" stroke-linecap="round"/></svg><span class="ml-2 text-sm text-slate-500">Analyzing with AI...</span></div>';
  modal.classList.remove("hidden");

  try {
    const data = await apiCall(`/api/ai/alternatives/${subId}`);

    if (data.error) {
      content.innerHTML = `<div class="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700">${data.error}</div>`;
      return;
    }

    const verdictColors = {
      keep: "bg-emerald-50 text-emerald-700 border-emerald-200",
      downgrade: "bg-amber-50 text-amber-700 border-amber-200",
      switch: "bg-blue-50 text-blue-700 border-blue-200",
      cancel: "bg-rose-50 text-rose-700 border-rose-200",
    };
    const verdictLabels = { keep: "Keep", downgrade: "Downgrade", switch: "Switch", cancel: "Cancel" };
    const vc = verdictColors[data.verdict] || verdictColors.keep;

    let html = `<div class="mb-4 p-3 rounded-md border ${vc}">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs font-bold uppercase tracking-wide">Verdict: ${verdictLabels[data.verdict] || data.verdict}</span>
      </div>
      <p class="text-xs">${data.verdictReason || ""}</p>
    </div>`;

    const alts = data.alternatives || [];
    if (alts.length > 0) {
      html += '<div class="space-y-2">';
      alts.forEach((alt) => {
        const price = alt.cost === 0 ? '<span class="text-emerald-600 font-bold">Free</span>' : `<span class="font-bold">$${Number(alt.cost).toFixed(2)}</span><span class="text-slate-400">/mo</span>`;
        html += `<div class="p-3 bg-slate-50 rounded-md border border-slate-100">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-sm font-semibold text-slate-800">${alt.name}</span>
            <span class="text-sm">${price}</span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div><span class="text-emerald-600 font-medium">Pros:</span> <span class="text-slate-600">${alt.pros || "—"}</span></div>
            <div><span class="text-rose-500 font-medium">Cons:</span> <span class="text-slate-600">${alt.cons || "—"}</span></div>
          </div>
          ${alt.url ? `<a href="${alt.url}" target="_blank" rel="noopener" class="inline-block mt-1.5 text-xs text-brand-600 hover:underline">Visit website</a>` : ""}
        </div>`;
      });
      html += '</div>';
    } else {
      html += '<p class="text-sm text-slate-500">No alternatives found.</p>';
    }

    content.innerHTML = html;
  } catch {
    content.innerHTML = '<div class="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700">Failed to find alternatives.</div>';
  }
}

// --- Toast ---

function showToast(message, type = "info") {
  const existing = document.getElementById("toast");
  if (existing) existing.remove();

  const colors = { success: "bg-emerald-600", error: "bg-rose-600", info: "bg-brand-600" };
  const toast = document.createElement("div");
  toast.id = "toast";
  toast.className = `fixed top-16 right-4 z-50 px-4 py-2 rounded-md text-white text-sm font-medium shadow-lg ${colors[type] || colors.info} animate-fade-in-up`;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// --- Chart ---

function initCategoryChart(categoryData) {
  const canvas = document.getElementById("categoryChart");
  if (!canvas || !categoryData) return;

  const labels = Object.keys(categoryData);
  const data = Object.values(categoryData);
  if (labels.length === 0) return;

  const palette = ["#6366f1", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4", "#8b5cf6", "#ec4899", "#14b8a6"];

  new Chart(canvas, {
    type: "doughnut",
    data: {
      labels,
      datasets: [{ data, backgroundColor: palette.slice(0, labels.length), borderWidth: 0, hoverOffset: 4 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: {
        legend: { position: "bottom", labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8, font: { size: 11 } } },
      },
    },
  });
}

// --- Init ---

document.addEventListener("DOMContentLoaded", () => {
  const subForm = document.getElementById("subscriptionForm");
  if (subForm) {
    subForm.addEventListener("submit", (e) => {
      e.preventDefault();
      handleSubscriptionForm(subForm);
    });
  }
});
