const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwVjje6NL54Uj8HghM-seBsHaHkuAdLRO9JZZ1jhYWo10KnnVNHxdW4TVn42xvIPJ5GkA/exec";

// SEARCH INPUT
const searchMobile = document.getElementById("searchMobile");
const searchMemberBtn = document.getElementById("searchMemberBtn");

// MEMBER DETAILS
const memberName = document.getElementById("memberName");
const memberId = document.getElementById("memberId");
const currentPlan = document.getElementById("currentPlan");
const currentEndDate = document.getElementById("currentEndDate");

// HIDDEN
const hiddenAdmissionId = document.getElementById("hiddenAdmissionId");
const hiddenMobile = document.getElementById("hiddenMobile");

// RENEWAL FORM
const renewalForm = document.getElementById("renewalForm");
const newPlan = document.getElementById("newPlan");
const renewStartDate = document.getElementById("renewStartDate");
const renewEndDate = document.getElementById("renewEndDate");

const totalAmount = document.getElementById("totalAmount");
const discount = document.getElementById("discount");
const finalAmount = document.getElementById("finalAmount");
const paymentMode = document.getElementById("paymentMode");
const saveBtn = document.getElementById("saveRenewalBtn");

const RENEWAL_BTN_DEFAULT = saveBtn ? saveBtn.textContent : "Save Renewal";

function setRenewalSubmitting(isSubmitting) {
  if (!saveBtn) return;
  saveBtn.disabled = isSubmitting;
  saveBtn.textContent = isSubmitting ? "Submitting..." : RENEWAL_BTN_DEFAULT;
  saveBtn.style.opacity = isSubmitting ? "0.7" : "1";
  saveBtn.style.cursor = isSubmitting ? "not-allowed" : "pointer";
}

function setSearchLoading(isLoading) {
  if (!searchMemberBtn) return;
  searchMemberBtn.disabled = isLoading;
  searchMemberBtn.textContent = isLoading ? "Searching..." : "Search";
  searchMemberBtn.style.opacity = isLoading ? "0.7" : "1";
  searchMemberBtn.style.cursor = isLoading ? "not-allowed" : "pointer";
  searchMobile.disabled = isLoading;
}

async function triggerMembershipSync() {
  const urls = ["/admin/sync-members", "http://localhost:8080/admin/sync-members"];
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "POST" });
      if (res.ok) return true;
    } catch (_) {}
  }
  return false;
}

function ddmmyyyyToISO(dateStr) {
  if (!dateStr) return "";
  const [dd, mm, yyyy] = dateStr.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

function fetchMember() {
  const input = searchMobile.value.trim();
  if (!input) return alert("Enter Mobile Number or Admission ID");

  let queryParam = "";
  const isAdmissionId = /^(ZF|HH|DC)-\d+$/i.test(input);

  if (isAdmissionId) {
    queryParam = `admissionId=${encodeURIComponent(input)}`;
  } else {
    queryParam = `mobile=${encodeURIComponent(input)}`;
  }

  setSearchLoading(true);

  fetch(`${SCRIPT_URL}?action=fetchMember&${queryParam}`)
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        alert("❌ Member not found");
        return;
      }

      memberName.value = data.name;
      memberId.value = data.admissionId;
      currentPlan.value = data.plan;
      currentEndDate.value = data.endDate || "";

      hiddenAdmissionId.value = data.admissionId;
      hiddenMobile.value = data.mobile;

      enableRenewalForm();

      if (data.endDate) {
        const isoEndDate = ddmmyyyyToISO(data.endDate);
        const d = new Date(isoEndDate);
        d.setDate(d.getDate() + 1);
        renewStartDate.value = d.toISOString().split("T")[0];
      }
    })
    .catch(err => {
      console.error(err);
      alert("Error fetching member");
    })
    .finally(() => {
      setSearchLoading(false);
    });
}

function enableRenewalForm() {
  [
    newPlan,
    renewStartDate,
    renewEndDate,
    totalAmount,
    discount,
    paymentMode,
    saveBtn
  ].forEach(el => {
    el.disabled = false;
  });
}

function calculateRenewEndDate() {
  if (!newPlan.value || !renewStartDate.value) {
    renewEndDate.value = "";
    return;
  }

  if (newPlan.value === "custom") {
    renewEndDate.value = "";
    return;
  }

  const d = new Date(renewStartDate.value);
  d.setDate(d.getDate() + parseInt(newPlan.value));
  renewEndDate.value = d.toISOString().split("T")[0];
}

function calculateFinalAmount() {
  finalAmount.value =
    (Number(totalAmount.value) || 0) - (Number(discount.value) || 0);
}

renewalForm.addEventListener("submit", function (e) {
  e.preventDefault();

  if (!hiddenAdmissionId.value) return alert("Please search and select a member first");
  if (!newPlan.value) return alert("Please select a renewal plan");
  if (!renewStartDate.value) return alert("Please select a renewal start date");
  if (!renewEndDate.value) return alert("Please select a renewal end date");

  const formData = new FormData();
  formData.append("action", "saveRenewal");
  formData.append("admissionId", hiddenAdmissionId.value);
  formData.append("mobile", hiddenMobile.value);
  formData.append("name", memberName.value);
  formData.append("plan", newPlan.value);
  formData.append("isCustomPackage", newPlan.value === "custom" ? "YES" : "NO");
  formData.append("startDate", renewStartDate.value);
  formData.append("endDate", renewEndDate.value);
  formData.append("amount", totalAmount.value);
  formData.append("discount", discount.value);
  formData.append("finalAmount", finalAmount.value);
  formData.append("paymentMode", paymentMode.value);

  setRenewalSubmitting(true);

  fetch(SCRIPT_URL, {
    method: "POST",
    body: formData
  })
    .then(res => res.text())
    .then(async txt => {
      const raw = (txt || "").trim();

      let data = null;
      try {
        data = JSON.parse(raw);
      } catch (_) {
        data = null;
      }

      if (data && data.success) {
        alert("✅ Renewal Saved Successfully");
        triggerMembershipSync().catch(() => {});
        renewalForm.reset();
        memberName.value = "";
        memberId.value = "";
        currentPlan.value = "";
        currentEndDate.value = "";
        hiddenAdmissionId.value = "";
        hiddenMobile.value = "";
        renewEndDate.value = "";
        finalAmount.value = "";
        return;
      }

      if (/success/i.test(raw)) {
        alert("✅ Renewal Saved Successfully");
        triggerMembershipSync().catch(() => {});
        renewalForm.reset();
        memberName.value = "";
        memberId.value = "";
        currentPlan.value = "";
        currentEndDate.value = "";
        hiddenAdmissionId.value = "";
        hiddenMobile.value = "";
        renewEndDate.value = "";
        finalAmount.value = "";
        return;
      }

      alert("❌ Error saving renewal: " + raw);
    })
    .catch(err => {
      console.error(err);
      alert("❌ Network error");
    })
    .finally(() => {
      setRenewalSubmitting(false);
    });
});

newPlan.addEventListener("change", calculateRenewEndDate);
renewStartDate.addEventListener("change", calculateRenewEndDate);
totalAmount.addEventListener("input", calculateFinalAmount);
discount.addEventListener("input", calculateFinalAmount);
