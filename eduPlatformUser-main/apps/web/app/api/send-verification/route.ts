import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

export async function POST(req: NextRequest) {
  // Read env vars inside the handler so missing vars cause a 500 at runtime,
  // not a crash at module-load / build time.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (!supabaseUrl || !serviceRoleKey || !resendKey) {
    console.error("Missing env vars: SUPABASE_SERVICE_ROLE_KEY or RESEND_API_KEY");
    return NextResponse.json({ error: "Server not configured" }, { status: 500 });
  }

  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Server-side Supabase admin client (service role — never expose to the browser)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const resend = new Resend(resendKey);

    // Use the request origin so the link works in both dev and production
    const origin = req.headers.get("origin") || "https://localhost:3001";

    // Generate a magic link via the Supabase Admin API.
    // A magic link both confirms the email AND logs the user in — perfect for
    // first-time confirmation. The admin API bypasses the free-tier email limit.
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

    // Send via Resend.
    // NOTE: Without a verified domain in Resend, "from" must be onboarding@resend.dev
    // and emails can only be delivered to the Resend account owner's email (fine for testing).
    // For production: verify a domain at resend.com and update the from address below.
    const { error: emailError } = await resend.emails.send({
      from: "EduPlatform <onboarding@resend.dev>",
      to: [email],
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

    if (emailError) {
      console.error("Resend error:", emailError);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("send-verification unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
