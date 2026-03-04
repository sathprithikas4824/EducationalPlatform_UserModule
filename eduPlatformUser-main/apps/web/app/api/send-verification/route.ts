import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!supabaseUrl || !serviceRoleKey || !gmailUser || !gmailPass) {
    console.error("Missing env vars: SUPABASE_SERVICE_ROLE_KEY / GMAIL_USER / GMAIL_APP_PASSWORD");
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Use the request origin so the link works in both dev and production
    const origin = req.headers.get("origin") || "http://localhost:3001";

    // Generate a magic link via Supabase Admin API.
    // A magic link confirms the email AND logs the user in automatically.
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${origin}/auth/callback` },
    });

    if (linkError || !data?.properties?.action_link) {
      console.error("generateLink error:", linkError);
      return NextResponse.json(
        { error: linkError?.message || "Could not generate verification link" },
        { status: 500 }
      );
    }

    // Send via Gmail SMTP — reliable delivery to any Gmail without domain verification
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: gmailUser,
        pass: gmailPass, // Must be a Gmail App Password (not your regular password)
      },
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

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("send-verification unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
