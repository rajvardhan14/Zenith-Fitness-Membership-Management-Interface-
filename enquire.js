const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyt3UviMpgrQfPbFtk8dLkrBLNn1IjTpFpLnOa42012GtQWNxp1CuGj4peDbIoc3XGq/exec";

const enquiryForm = document.getElementById("enquiryForm");
const submitEnquiryBtn = document.getElementById("submitEnquiryBtn");

const enqName = document.getElementById("enqName");
const enqContact = document.getElementById("enqContact");
const enqEmail = document.getElementById("enqEmail");
const enqInterestedIn = document.getElementById("enqInterestedIn");
const enqSource = document.getElementById("enqSource");
const enqFollowUpDate = document.getElementById("enqFollowUpDate");
const enqMessage = document.getElementById("enqMessage");

const ENQUIRY_BTN_DEFAULT = submitEnquiryBtn ? submitEnquiryBtn.textContent : "Submit Enquiry";

function setEnquirySubmitting(isSubmitting) {
  if (!submitEnquiryBtn) return;
  submitEnquiryBtn.disabled = isSubmitting;
  submitEnquiryBtn.textContent = isSubmitting ? "Submitting..." : ENQUIRY_BTN_DEFAULT;
}

enquiryForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const name = String(enqName.value || "").trim();
  const contact = String(enqContact.value || "").trim();

  if (!name) return alert("Please enter Name");
  if (!contact) return alert("Please enter Contact No");

  const formData = new FormData();
  formData.append("action", "enquire");
  formData.append("name", name);
  formData.append("contact", contact);
  formData.append("email", String(enqEmail.value || "").trim());
  formData.append("interestedIn", String(enqInterestedIn.value || "").trim());
  formData.append("source", String(enqSource.value || "").trim());
  formData.append("followUpDate", String(enqFollowUpDate.value || "").trim());
  formData.append("message", String(enqMessage.value || "").trim());

  setEnquirySubmitting(true);

  fetch(SCRIPT_URL, { method: "POST", body: formData })
    .then((res) => res.text())
    .then((txt) => {
      const raw = (txt || "").trim();

      let data = null;
      try {
        data = JSON.parse(raw);
      } catch (_) {
        data = null;
      }

      if (data && data.success) {
        alert("✅ Enquiry Submitted Successfully");
        enquiryForm.reset();
        return;
      }

      alert("❌ Error submitting enquiry: " + raw);
    })
    .catch((err) => {
      console.error(err);
      alert("❌ Network / Script Error");
    })
    .finally(() => {
      setEnquirySubmitting(false);
    });
});
