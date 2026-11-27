// Six-digit email verification flow for Connect Social.
const EMAIL_CODE_API = "https://connect-social-verification.williamsjenifermary.workers.dev";
let emailCodeStage = "email";
let verifiedSignupEmail = "";
let lastAuthMode = mode;

function updateAuthForm() {
  if (mode !== lastAuthMode) {
    emailCodeStage = "email";
    verifiedSignupEmail = "";
    lastAuthMode = mode;
  }
  const phone = authMethod === "phone";
  const signup = mode === "signup";
  show($("#usernameField"), phone ? signup : (signup && emailCodeStage === "account"));
  show($("#emailField"), !phone);
  show($("#passwordField"), phone ? false : (!signup || emailCodeStage === "account"));
  show($("#phoneField"), phone);
  show($("#emailCodeField"), !phone && signup && emailCodeStage === "code");
  if (!phone) resetPhoneFlow();
  $("#email").required = !phone;
  $("#phone").required = phone;
  $("#password").required = !phone && (!signup || emailCodeStage === "account");
  $("#username").required = phone ? signup : (signup && emailCodeStage === "account");
  $("#emailCode").required = !phone && signup && emailCodeStage === "code";
  $("#authSubmit").textContent = phone
    ? (phoneConfirmation ? "Verify code" : "Send verification code")
    : (!signup ? "Login" : emailCodeStage === "email" ? "Send verification code" : emailCodeStage === "code" ? "Verify code" : "Create account");
  document.querySelectorAll(".method").forEach(x => x.classList.toggle("active", x.dataset.method === authMethod));
}
$("#email").addEventListener("input", () => {
  if (verifiedSignupEmail && $("#email").value.trim().toLowerCase() !== verifiedSignupEmail) {
    emailCodeStage = "email";
    verifiedSignupEmail = "";
    updateAuthForm();
    note("#authMessage", "Email changed. Request a new verification code.");
  }
});

$("#authForm").onsubmit = async e => {
  e.preventDefault();
  note("#authMessage", "Please wait…");
  try {
    if (authMethod === "email") {
      const emailValue = $("#email").value.trim().toLowerCase();
      const password = $("#password").value;
      if (!emailValue) { note("#authMessage", "Enter your email address."); return; }

      if (mode === "signup" && emailCodeStage === "email") {
        const result = await fetch(EMAIL_CODE_API + "/send-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailValue })
        });
        const data = await result.json();
        if (!result.ok) throw new Error(data.error || "Could not send your code.");
        emailCodeStage = "code";
        updateAuthForm();
        note("#authMessage", "A six-digit verification code has been sent. Check your inbox and spam folder.");
        return;
      }

      if (mode === "signup" && emailCodeStage === "code") {
        const code = $("#emailCode").value.trim();
        if (!/^\d{6}$/.test(code)) { note("#authMessage", "Enter the six-digit code from your email."); return; }
        const result = await fetch(EMAIL_CODE_API + "/verify-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailValue, code })
        });
        const data = await result.json();
        if (!result.ok || data.verified !== true) throw new Error(data.error || "Code verification failed.");
        verifiedSignupEmail = emailValue;
        emailCodeStage = "account";
        updateAuthForm();
        note("#authMessage", "Email verified! Now choose your username and password to create your account.");
        return;
      }

      if (mode === "signup") {
        if (!verifiedSignupEmail || verifiedSignupEmail !== emailValue || emailCodeStage !== "account") {
          emailCodeStage = "email";
          updateAuthForm();
          note("#authMessage", "Verify your email address first.");
          return;
        }
        const username = cleanName($("#username").value);
        if (username.length < 2) { note("#authMessage", "Choose a username with at least 2 letters or numbers."); return; }
        const credential = await auth.createUserWithEmailAndPassword(emailValue, password);
        await saveNewUserProfile(credential.user, username);
        emailCodeStage = "email";
        verifiedSignupEmail = "";
        note("#authMessage", "Your email was verified and your Connect Social account is ready.");
      } else {
        const loginEmail = emailValue.includes("@") ? emailValue : emailFor(emailValue);
        await auth.signInWithEmailAndPassword(loginEmail, password);
      }
    } else {
      const phone = $("#phone").value.trim();
      if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
        note("#authMessage", "Enter your phone number with country code, e.g. +2348012345678.");
        return;
      }
      if (!phoneConfirmation) {
        if (mode === "signup") {
          pendingSignupUsername = cleanName($("#username").value);
          if (pendingSignupUsername.length < 2) {
            note("#authMessage", "Choose a username with at least 2 letters or numbers.");
            return;
          }
        }
        phoneConfirmation = await auth.signInWithPhoneNumber(phone, makeRecaptcha());
        show($("#smsCodeField"), true);
        $("#authSubmit").textContent = "Verify code";
        note("#authMessage", "We sent an SMS code. Enter it below.");
      } else {
        const result = await phoneConfirmation.confirm($("#smsCode").value.trim());
        if (mode === "signup") await saveNewUserProfile(result.user, pendingSignupUsername);
        pendingSignupUsername = "";
        note("#authMessage", "Phone number verified. Your account is ready.");
      }
    }
  } catch (err) {
    note("#authMessage", ({
      "auth/email-already-in-use": "That email is already registered.",
      "auth/invalid-email": "Enter a valid email address.",
      "auth/invalid-credential": "Email/username or password is incorrect.",
      "auth/user-not-found": "Account not found.",
      "auth/weak-password": "Use a password with at least 6 characters.",
      "auth/operation-not-allowed": "Enable this sign-in method in Firebase Authentication.",
      "auth/invalid-phone-number": "Check the phone number and include its country code.",
      "auth/too-many-requests": "Too many attempts. Please wait and try again.",
      "auth/captcha-check-failed": "Security check failed. Refresh the page and try again."
    })[err.code] || err.message);
    if (authMethod === "phone" && recaptchaVerifier) {
      try { recaptchaVerifier.clear(); } catch (e) {}
      recaptchaVerifier = null;
    }
  }
};
updateAuthForm();
