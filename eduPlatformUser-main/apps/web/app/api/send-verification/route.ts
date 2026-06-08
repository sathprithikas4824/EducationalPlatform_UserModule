import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";
import { ok, validationError, serverError, serviceUnavailable } from "../../lib/apiResponse";
import { logger, maskEmail } from "../../lib/logger";

const ROUTE = "/api/send-verification";

export async function POST(req: NextRequest) {
  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const gmailUser      = process.env.GMAIL_USER;
  const gmailPass      = process.env.GMAIL_APP_PASSWORD;

  if (!supabaseUrl || !serviceRoleKey || !gmailUser || !gmailPass) {
    logger.error(ROUTE, "send_verification", "anonymous",
      "Missing env vars: SUPABASE_SERVICE_ROLE_KEY / GMAIL_USER / GMAIL_APP_PASSWORD");
    return serviceUnavailable("Email service is not configured");
  }

  try {
    const { email } = await req.json();

    if (!email) {
      logger.warn(ROUTE, "send_verification", "anonymous",
        "Verification request missing email field");
      return validationError("Email is required");
    }

    const masked = maskEmail(email as string);
    const origin = req.headers.get("origin") || "http://localhost:3001";

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${origin}/auth/callback` },
    });

    if (linkError || !data?.properties?.action_link) {
      logger.error(ROUTE, "send_verification", "anonymous",
        "Supabase failed to generate verification link", linkError, {
          payload: { maskedEmail: masked },
        });
      return serverError(linkError?.message || "Could not generate verification link");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPass },
    });

    await transporter.sendMail({
      from: `EduPlatform <${gmailUser}>`,
      to: email,
      subject: "Confirm your EduPlatform account",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
          <div style="background:linear-gradient(135deg,#7a12fa,#b614ef);border-radius:14px;padding:28px;text-align:center;margin-bottom:28px;">
            <h1 style="color:white;margin:0;font-size:26px;font-weight:700;">EduPlatform</h1>
          </div>
          <h2 style="color:#111827;font-size:20px;margin-bottom:8px;">Confirm your email address</h2>
          <p style="color:#6b7280;line-height:1.6;margin-bottom:28px;">
            You're almost there! Click the button below to verify your email
            address and start learning.
          </p>
          <div style="text-align:center;margin-bottom:28px;">
            <a href="${data.properties.action_link}"
               style="background:linear-gradient(90deg,#7a12fa,#b614ef);color:white;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">
              Confirm Email Address
            </a>
          </div>
          <p style="color:#9ca3af;font-size:13px;text-align:center;line-height:1.5;">
            This link expires in 24 hours.<br>
            If you didn't create an account you can safely ignore this email.
          </p>
        </div>
      `,
    });

    logger.info(ROUTE, "send_verification", "anonymous",
      "Verification email sent", { maskedEmail: masked });

    return ok(null, "Verification email sent");
  } catch (err) {
    logger.error(ROUTE, "send_verification", "anonymous",
      "Unexpected error in send-verification route", err);
    return serverError("Internal server error");
  }
}
