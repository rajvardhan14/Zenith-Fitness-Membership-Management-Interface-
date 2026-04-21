const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwVjje6NL54Uj8HghM-seBsHaHkuAdLRO9JZZ1jhYWo10KnnVNHxdW4TVn42xvIPJ5GkA/exec";

// Get all input elements
const admissionForm = document.getElementById("admissionForm");
const submitAdmissionBtn = document.getElementById("submitAdmissionBtn");
const nameInput = document.getElementById("name");
const mobileInput = document.getElementById("mobile");
const genderInput = document.getElementById("gender");
const ageInput = document.getElementById("age");
const planInput = document.getElementById("plan");
const categoryInput = document.getElementById("category");
const startDateInput = document.getElementById("startDate");
const endDateInput = document.getElementById("endDate");
const totalAmountInput = document.getElementById("totalAmount");
const discountInput = document.getElementById("discount");
const finalAmountInput = document.getElementById("finalAmount");
const paymentModeInput = document.getElementById("paymentMode");
const paymentStatusInput = document.getElementById("paymentStatus");
const remarksInput = document.getElementById("remarks");
const birthDateInput = document.getElementById("birthDate");
const addressInput = document.getElementById("address");
const injuriesInput = document.getElementById("injuries");

const ADMISSION_BTN_DEFAULT = submitAdmissionBtn ? submitAdmissionBtn.textContent : "Submit Admission";

/* =========================
   AUTO CALCULATE END DATE
========================= */
function calculateEndDate() {
  if (!startDateInput.value || !planInput.value) {
    endDateInput.value = "";
    return;
  }

  // For customize package, do not auto-calculate
  if (planInput.value === "custom") {
    endDateInput.value = "";
    return;
  }

  const d = new Date(startDateInput.value);
  d.setDate(d.getDate() + parseInt(planInput.value));
  endDateInput.value = d.toISOString().split("T")[0];
}

/* =========================
   AUTO CALCULATE FINAL AMOUNT
========================= */
function calculateFinalAmount() {
  finalAmountInput.value =
    (Number(totalAmountInput.value) || 0) - (Number(discountInput.value) || 0);
}

function setAdmissionSubmitting(isSubmitting) {
  if (!submitAdmissionBtn) return;
  submitAdmissionBtn.disabled = isSubmitting;
  submitAdmissionBtn.textContent = isSubmitting ? "Submitting..." : ADMISSION_BTN_DEFAULT;
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

/* =========================
   SUBMIT FORM
========================= */
admissionForm.addEventListener("submit", function (e) {
  e.preventDefault();

  // Basic validation
  if (!planInput.value) return alert("Please select a plan");
if (!categoryInput.value) return alert("Please select a membership type");
if (!startDateInput.value) return alert("Please select a start date");
if (!endDateInput.value) return alert("Please select an end date");

  const formData = new FormData();
  formData.append("name", nameInput.value);
  formData.append("mobile", mobileInput.value);
  formData.append("gender", genderInput.value);
  formData.append("age", ageInput.value);
  formData.append("plan", planInput.value);
   formData.append("isCustomPackage", planInput.value === "custom" ? "YES" : "NO");
  formData.append("category", categoryInput.value);
  formData.append("startDate", startDateInput.value);
  formData.append("endDate", endDateInput.value);
  formData.append("totalAmount", totalAmountInput.value);
  formData.append("discount", discountInput.value);
  formData.append("finalAmount", finalAmountInput.value);
  formData.append("paymentMode", paymentModeInput.value);
  formData.append("paymentStatus", paymentStatusInput.value);
  formData.append("remarks", remarksInput.value);
  formData.append("action", "admission");
  formData.append("birthDate", birthDateInput.value);
  formData.append("address", addressInput.value);
  formData.append("injuries", injuriesInput.value);

  setAdmissionSubmitting(true);

  fetch(SCRIPT_URL, {
    method: "POST",
    body: formData
  })
    .then(res => res.text())
    .then(async txt => {
      const raw = (txt || "").trim();

      if (raw === "DUPLICATE_MOBILE") {
        alert("❌ This mobile number is already registered");
        return;
      }

      let data = null;
      try {
        data = JSON.parse(raw);
      } catch (_) {
        data = null;
      }

      if (data && data.success) {
        await triggerMembershipSync();
        alert("✅ Admission Saved Successfully");
        admissionForm.reset();
endDateInput.value = "";
finalAmountInput.value = "";
return;
      }

      if (/success/i.test(raw)) {
        await triggerMembershipSync();
        alert("✅ Admission Saved Successfully");
        admissionForm.reset();
endDateInput.value = "";
finalAmountInput.value = "";
return;
      }

      alert("❌ Server Error: " + raw);
    })
    .catch(err => {
      console.error(err);
      alert("❌ Network / Script Error");
    })
    .finally(() => {
      setAdmissionSubmitting(false);
    });
});

/* =========================
   EVENT LISTENERS
========================= */
planInput.addEventListener("change", calculateEndDate);
startDateInput.addEventListener("change", calculateEndDate);
totalAmountInput.addEventListener("input", calculateFinalAmount);
discountInput.addEventListener("input", calculateFinalAmount);
