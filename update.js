const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwVjje6NL54Uj8HghM-seBsHaHkuAdLRO9JZZ1jhYWo10KnnVNHxdW4TVn42xvIPJ5GkA/exec";

const searchMember = document.getElementById("searchMember");
const searchBtn = document.getElementById("searchBtn");

const memberName = document.getElementById("memberName");
const memberId = document.getElementById("memberId");
const currentPlan = document.getElementById("currentPlan");
const currentStartDate = document.getElementById("currentStartDate");
const currentEndDate = document.getElementById("currentEndDate");
const currentPaymentStatus = document.getElementById("currentPaymentStatus");
const currentPendingAmount = document.getElementById("currentPendingAmount");

const hiddenAdmissionId = document.getElementById("hiddenAdmissionId");
const hiddenMobile = document.getElementById("hiddenMobile");

const paymentForm = document.getElementById("paymentForm");
const amountPaid = document.getElementById("amountPaid");
const paymentMode = document.getElementById("paymentMode");
const paymentNote = document.getElementById("paymentNote");
const savePaymentBtn = document.getElementById("savePaymentBtn");

const packageForm = document.getElementById("packageForm");
const newPlan = document.getElementById("newPlan");
const newStartDate = document.getElementById("newStartDate");
const newEndDate = document.getElementById("newEndDate");
const packageNote = document.getElementById("packageNote");
const savePackageBtn = document.getElementById("savePackageBtn");

const SAVE_PAYMENT_DEFAULT = savePaymentBtn.textContent;
const SAVE_PACKAGE_DEFAULT = savePackageBtn.textContent;

function ddmmyyyyToISO(dateStr) {
  if (!dateStr) return "";
  const [dd, mm, yyyy] = dateStr.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

function isAdmissionId(value) {
  return /^(ZF|HH|PT)-\d+$/i.test(value);
}

function setFormEnabled(enabled) {
  [
    amountPaid,
    paymentMode,
    paymentNote,
    savePaymentBtn,
    newPlan,
    newStartDate,
    newEndDate,
    packageNote,
    savePackageBtn
  ].forEach(el => {
    el.disabled = !enabled;
  });
}

function setSubmitting(button, isSubmitting, defaultText) {
  button.disabled = isSubmitting;
  button.textContent = isSubmitting ? "Saving..." : defaultText;
}

function calculatePackageEndDate() {
  if (!newPlan.value || !newStartDate.value) return;
  if (newPlan.value === "custom") return;

  const d = new Date(newStartDate.value);
  d.setDate(d.getDate() + Number(newPlan.value));
  newEndDate.value = d.toISOString().split("T")[0];
}

async function triggerMembershipSync() {
  const urls = ["/admin/sync-members", "http://localhost:8080/admin/sync-members"];
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "POST" });
      if (res.ok) return true;
    } catch (_) {
      // Try next candidate URL.
    }
  }
  return false;
}

async function fetchMember() {
  const input = searchMember.value.trim();
  if (!input) return alert("Enter Mobile Number or Admission ID");

  const queryParam = isAdmissionId(input)
    ? `admissionId=${encodeURIComponent(input)}`
    : `mobile=${encodeURIComponent(input)}`;

  try {
    searchBtn.disabled = true;
    searchBtn.textContent = "Searching...";

    const res = await fetch(`${SCRIPT_URL}?action=fetchMember&${queryParam}`);
    const data = await res.json();

    if (!data.success) {
      alert("Member not found");
      return;
    }

    memberName.value = data.name || "";
    memberId.value = data.admissionId || "";
    currentPlan.value = data.plan || "";
    currentStartDate.value = data.startDate || "";
    currentEndDate.value = data.endDate || "";
    currentPaymentStatus.value = data.paymentStatus || "";
    currentPendingAmount.value = Number(data.pendingAmount) || 0;

    hiddenAdmissionId.value = data.admissionId || "";
    hiddenMobile.value = data.mobile || "";

    if (data.endDate) {
      const d = new Date(ddmmyyyyToISO(data.endDate));
      d.setDate(d.getDate() + 1);
      newStartDate.value = d.toISOString().split("T")[0];
    }

    setFormEnabled(true);
  } catch (err) {
    console.error(err);
    alert("Error fetching member");
  } finally {
    searchBtn.disabled = false;
    searchBtn.textContent = "Search";
  }
}

paymentForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (!hiddenAdmissionId.value) return alert("Search member first");
  if ((Number(amountPaid.value) || 0) <= 0) return alert("Enter amount received");

  const formData = new FormData();
  formData.append("action", "updatePendingPayment");
  formData.append("admissionId", hiddenAdmissionId.value);
  formData.append("mobile", hiddenMobile.value);
  formData.append("name", memberName.value);
  formData.append("amountPaid", amountPaid.value);
  formData.append("paymentMode", paymentMode.value);
  formData.append("remarks", paymentNote.value);

  try {
    setSubmitting(savePaymentBtn, true, SAVE_PAYMENT_DEFAULT);
    const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
    const data = await res.json();

    if (!data.success) {
      alert("Payment update failed: " + (data.message || "Unknown error"));
      return;
    }

    alert("Payment updated successfully");
    amountPaid.value = "";
    paymentMode.value = "";
    paymentNote.value = "";
    await fetchMember();
  } catch (err) {
    console.error(err);
    alert("Network error");
  } finally {
    setSubmitting(savePaymentBtn, false, SAVE_PAYMENT_DEFAULT);
  }
});

packageForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  if (!hiddenAdmissionId.value) return alert("Search member first");
  if (!newEndDate.value) return alert("Select or enter the new end date");

  const formData = new FormData();
  formData.append("action", "changeMembershipPackage");
  formData.append("admissionId", hiddenAdmissionId.value);
  formData.append("mobile", hiddenMobile.value);
  formData.append("name", memberName.value);
  formData.append("plan", newPlan.value);
  formData.append("startDate", newStartDate.value);
  formData.append("endDate", newEndDate.value);
  formData.append("remarks", packageNote.value);

  try {
    setSubmitting(savePackageBtn, true, SAVE_PACKAGE_DEFAULT);
    const res = await fetch(SCRIPT_URL, { method: "POST", body: formData });
    const data = await res.json();

    if (!data.success) {
      alert("Package update failed: " + (data.message || "Unknown error"));
      return;
    }

    await triggerMembershipSync();
    alert("Package updated successfully");
    packageForm.reset();
    await fetchMember();
  } catch (err) {
    console.error(err);
    alert("Network error");
  } finally {
    setSubmitting(savePackageBtn, false, SAVE_PACKAGE_DEFAULT);
  }
});

searchBtn.addEventListener("click", fetchMember);
searchMember.addEventListener("keydown", e => {
  if (e.key === "Enter") fetchMember();
});
newPlan.addEventListener("change", calculatePackageEndDate);
newStartDate.addEventListener("change", calculatePackageEndDate);
