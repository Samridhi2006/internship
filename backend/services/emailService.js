export async function sendVerificationEmail(email, name, token) {
  console.log(`✉️ Sending verification email to ${email} for user ${name}. Verification Token: ${token}`);
  return true;
}

export async function sendPasswordResetEmail(email, name, token, expiry) {
  console.log(`✉️ Sending password reset email to ${email} for user ${name}. Reset Token: ${token}, Expiry: ${expiry}`);
  return true;
}

export async function sendAnomalyAlertEmail(email, name, details) {
  console.log(`⚠️ Sending anomaly alert email to ${email} for user ${name}. Details:`, details);
  return true;
}
