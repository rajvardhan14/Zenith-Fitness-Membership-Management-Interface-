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
const amountPaidInput = document.getElementById("amountPaid");
const remarksInput = document.getElementById("remarks");
const birthDateInput = document.getElementById("birthDate");
const addressInput = document.getElementById("address");
const injuriesInput = document.getElementById("injuries");

const ADMISSION_BTN_DEFAULT = submitAdmissionBtn ? submitAdmissionBtn.textContent : "Submit Admission";

/* =========================
   AUTO CALCULATE END DATE
========================= */
function calculateEndDate() {
  if (!startDateInput.value || !planInput.value) return;

  const d = new Date(startDateInput.value);
  d.setDate(d.getDate() + parseInt(planInput.value));
  endDateInput.value = d.toISOString().split("T")[0];
}

/* =========================
   AUTO CALCULATE FINAL AMOUNT
========================= */
function calculateFinalAmount() {
  const finalAmount = (Number(totalAmountInput.value) || 0) - (Number(discountInput.value) || 0);
  finalAmountInput.value = finalAmount;
  syncAmountPaidWithStatus();
}

function syncAmountPaidWithStatus() {
  if (!amountPaidInput || !paymentStatusInput) return;

  const status = paymentStatusInput.value.toLowerCase();
  const finalAmount = Number(finalAmountInput.value) || 0;

  if (status === "paid") {
    amountPaidInput.value = finalAmount;
    amountPaidInput.readOnly = true;
    return;
  }

  if (status === "pending") {
    amountPaidInput.value = 0;
    amountPaidInput.readOnly = true;
    return;
  }

  amountPaidInput.readOnly = false;
}

function setAdmissionSubmitting(isSubmitting) {
  if (!submitAdmissionBtn) return;
  submitAdmissionBtn.disabled = isSubmitting;
  submitAdmissionBtn.textContent = isSubmitting ? "Submitting..." : ADMISSION_BTN_DEFAULT;
}

function extractNumericId(admissionId) {
  return admissionId ? admissionId.replace(/\D/g, '') : null;
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

function createAdmissionWhatsAppMessage(admissionId) {
  return `Welcome to Zenith Fitness ${nameInput.value || ""} 💪

Your admission has been successfully completed.

🆔 Admission ID: ${admissionId || ""}
-> Plan: ${planInput.options[planInput.selectedIndex]?.text || ""}
-> Start Date: ${formatISODateDDMMYYYY(startDateInput.value)}
-> End Date: ${formatISODateDDMMYYYY(endDateInput.value)}

We're excited to be a part of your fitness journey 🔥

-> Gym Timings:
Mon-Sat: 6:00 AM - 11:00 PM
Sunday: 6:30 AM - 10:00 AM

📲 Important:
Save this number *9272112745* in your contacts to receive important updates, workout tips, and announcements.

📸 Instagram:
https://www.instagram.com/zenithfitness360

Let's build your best version together`;
}

function askToSendWhatsApp(phone, message) {
  const formattedPhone = normalizePhoneForWhatsApp(phone);
  if (!formattedPhone) return;

  if (confirm("Admission saved. Send WhatsApp message now?")) {
    window.open(
      `https://wa.me/91${formattedPhone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  }
}

async function createUserInDevice(admissionId, name) {
  const deviceUserId = extractNumericId(admissionId);

  if (!deviceUserId) {
    console.error("Invalid Admission ID");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/device/add-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: deviceUserId,
        name: name
      })
    });

    const data = await res.json();
    console.log("Device user created:", data);
  } catch (err) {
    console.error("Device sync failed:", err);
  }
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

  const formData = new FormData();
  formData.append("name", nameInput.value);
  formData.append("mobile", mobileInput.value);
  formData.append("gender", genderInput.value);
  formData.append("age", ageInput.value);
  formData.append("plan", planInput.value);
  formData.append("category", categoryInput.value);
  formData.append("startDate", startDateInput.value);
  formData.append("endDate", endDateInput.value);
  formData.append("totalAmount", totalAmountInput.value);
  formData.append("discount", discountInput.value);
  formData.append("finalAmount", finalAmountInput.value);
  formData.append("amountPaid", amountPaidInput.value);
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
  const admissionId = data.admissionId || data.id || "";
  const whatsappMessage = createAdmissionWhatsAppMessage(admissionId);
  const whatsappPhone = mobileInput.value;
  
  await createUserInDevice(admissionId, nameInput.value);

  alert("✅ Admission Saved & User Created in Device");
  askToSendWhatsApp(whatsappPhone, whatsappMessage);
  admissionForm.reset();
  return;
}

      if (/success/i.test(raw)) {
        const whatsappMessage = createAdmissionWhatsAppMessage("");
        const whatsappPhone = mobileInput.value;
        await triggerMembershipSync();
        alert("✅ Admission Saved Successfully");
        askToSendWhatsApp(whatsappPhone, whatsappMessage);
        admissionForm.reset();
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
paymentStatusInput.addEventListener("change", syncAmountPaidWithStatus);
