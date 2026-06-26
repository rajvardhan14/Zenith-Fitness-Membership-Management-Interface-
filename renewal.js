const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwVjje6NL54Uj8HghM-seBsHaHkuAdLRO9JZZ1jhYWo10KnnVNHxdW4TVn42xvIPJ5GkA/exec";

// SEARCH INPUT
const searchMobile = document.getElementById("searchMobile");

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
const paymentStatus = document.getElementById("paymentStatus");
const amountPaid = document.getElementById("amountPaid");
const saveBtn = document.getElementById("saveRenewalBtn");

const RENEWAL_BTN_DEFAULT = saveBtn ? saveBtn.textContent : "Save Renewal";

function setRenewalSubmitting(isSubmitting) {
  if (!saveBtn) return;
  saveBtn.disabled = isSubmitting;
  saveBtn.textContent = isSubmitting ? "Submitting..." : RENEWAL_BTN_DEFAULT;
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

function ddmmyyyyToISO(dateStr) {
  if (!dateStr) return "";
  const [dd, mm, yyyy] = dateStr.split("-");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizePhoneForWhatsApp(mobile) {
  return String(mobile || "").replace(/\D/g, "").slice(-10);
}

function formatISODateDDMMYYYY(value) {
  if (!value) return "";
  const [yyyy, mm, dd] = value.split("-");
  if (!yyyy || !mm || !dd) return value;
  return `${dd}-${mm}-${yyyy}`;
}

function createRenewalWhatsAppMessage() {
  return `Hello ${memberName.value || ""},

Your membership at Zenith Fitness has been successfully renewed.

Admission ID: ${hiddenAdmissionId.value || ""}

Plan: ${newPlan.options[newPlan.selectedIndex]?.text || ""}

Start Date: ${formatISODateDDMMYYYY(renewStartDate.value)}

End Date: ${formatISODateDDMMYYYY(renewEndDate.value)}

Thank you for continuing your fitness journey with us. 💪

We truly appreciate your trust and support.

⭐ If you are genuinely happy with our services, we would be grateful if you could leave us a Google Review.

Your review helps us grow, reach more people, and build a stronger and healthier fitness community.

Google Review Link:

https://g.page/r/CTR-7sBIfPWYEBM/review

Thank you for being a valued member of Zenith Fitness.

Stay Fit. Stay Strong. 🔥

Team Zenith Fitness`;
}

function askToSendWhatsApp(phone, message) {
  const formattedPhone = normalizePhoneForWhatsApp(phone);
  if (!formattedPhone) return;

  if (confirm("Renewal saved. Send WhatsApp message now?")) {
    window.open(
      `https://wa.me/91${formattedPhone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  }
}

/* =========================
   FETCH MEMBER BY MOBILE
========================= */
function fetchMember() {
  const input = searchMobile.value.trim();
  if (!input) return alert("Enter Mobile Number or Admission ID");

  // Detect Admission ID when it matches <PREFIX>-<number>.
  // Numeric inputs should be treated as mobile numbers.
  let queryParam = "";
  const isAdmissionId = /^(ZF|HH|PT)-\d+$/i.test(input);

  if (isAdmissionId) {
    queryParam = `admissionId=${encodeURIComponent(input)}`;
  } else {
    queryParam = `mobile=${encodeURIComponent(input)}`;
  }

  fetch(`${SCRIPT_URL}?action=fetchMember&${queryParam}`)
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        alert("❌ Member not found");
        return;
      }

      // Populate member data
      memberName.value = data.name;
      memberId.value = data.admissionId;
      currentPlan.value = data.plan;
      currentEndDate.value = data.endDate || "";

      hiddenAdmissionId.value = data.admissionId;
      hiddenMobile.value = data.mobile;

      enableRenewalForm();

      // Default start date = next day after current end date
      if (data.endDate) {
        const isoEndDate = ddmmyyyyToISO(data.endDate);
        const d = new Date(isoEndDate);
        d.setDate(d.getDate() + 1);
        renewStartDate.value = d.toISOString().split("T")[0];
      }
    })
    .catch(err => {
      console.error(err);
      alert("❌ Error fetching member");
    });
}

/* =========================
   ENABLE FORM
========================= */
function enableRenewalForm() {
  [
    newPlan,
    renewStartDate,
    renewEndDate,
    totalAmount,
    discount,
    paymentMode,
    paymentStatus,
    amountPaid,
    saveBtn
  ].forEach(el => {
    el.disabled = false;
  });
}

/* =========================
   CALCULATE END DATE
========================= */
function calculateRenewEndDate() {
  if (!newPlan.value || !renewStartDate.value) return;
  if (newPlan.value === "custom") return;

  const d = new Date(renewStartDate.value);
  d.setDate(d.getDate() + parseInt(newPlan.value));
  renewEndDate.value = d.toISOString().split("T")[0];
}

/* =========================
   FINAL AMOUNT
========================= */
function calculateFinalAmount() {
  const finalDue = (Number(totalAmount.value) || 0) - (Number(discount.value) || 0);
  finalAmount.value = finalDue;
  syncAmountPaidWithStatus();
}

function syncAmountPaidWithStatus() {
  const status = paymentStatus.value.toLowerCase();
  const finalDue = Number(finalAmount.value) || 0;

  if (status === "paid") {
    amountPaid.value = finalDue;
    amountPaid.readOnly = true;
    return;
  }

  if (status === "pending") {
    amountPaid.value = 0;
    amountPaid.readOnly = true;
    return;
  }

  amountPaid.readOnly = false;
}

/* =========================
   SAVE RENEWAL
========================= */
renewalForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const formData = new FormData();
  formData.append("action", "saveRenewal");
  formData.append("admissionId", hiddenAdmissionId.value);
  formData.append("mobile", hiddenMobile.value);
  formData.append("name", memberName.value);
  formData.append("plan", newPlan.value);
  formData.append("startDate", renewStartDate.value);
  formData.append("endDate", renewEndDate.value);
  formData.append("amount", totalAmount.value);
  formData.append("discount", discount.value);
  formData.append("finalAmount", finalAmount.value);
  formData.append("paymentStatus", paymentStatus.value);
  formData.append("amountPaid", amountPaid.value);
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
        const whatsappPhone = hiddenMobile.value;
        const whatsappMessage = createRenewalWhatsAppMessage();
        await triggerMembershipSync();
        alert("✅ Renewal Saved Successfully");
        askToSendWhatsApp(whatsappPhone, whatsappMessage);
        renewalForm.reset();
        return;
      }

      if (/success/i.test(raw)) {
        const whatsappPhone = hiddenMobile.value;
        const whatsappMessage = createRenewalWhatsAppMessage();
        await triggerMembershipSync();
        alert("✅ Renewal Saved Successfully");
        askToSendWhatsApp(whatsappPhone, whatsappMessage);
        renewalForm.reset();
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

/* =========================
   LISTENERS
========================= */
newPlan.addEventListener("change", calculateRenewEndDate);
renewStartDate.addEventListener("change", calculateRenewEndDate);
totalAmount.addEventListener("input", calculateFinalAmount);
discount.addEventListener("input", calculateFinalAmount);
paymentStatus.addEventListener("change", syncAmountPaidWithStatus);
