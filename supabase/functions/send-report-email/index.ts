import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

/**
 * Email Report Edge Function with Electronic Acceptance
 *
 * This function sends quotation reports via email with optional electronic acceptance.
 *
 * DEPLOYMENT NOTE:
 * This function needs to be deployed to Supabase using the dashboard or CLI.
 * For production use, configure SMTP settings as environment variables:
 * - SMTP_HOST
 * - SMTP_PORT
 * - SMTP_USER
 * - SMTP_PASS
 *
 * You can also integrate with email services like SendGrid, Resend, or AWS SES.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  to: string;
  recipientName?: string;
  subject: string;
  reportName: string;
  reportType: string;
  jobNumber?: string;
  customerName?: string;
  pdfBase64: string;
  filename: string;
  quotationId?: string;
  message?: string;
  includeAcceptance?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    const getUserResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": supabaseServiceKey,
      },
    });

    if (!getUserResponse.ok) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const user = await getUserResponse.json();

    const {
      to,
      recipientName,
      subject,
      reportName,
      reportType,
      jobNumber,
      customerName,
      pdfBase64,
      filename,
      quotationId,
      message,
      includeAcceptance = false
    }: EmailRequest = await req.json();

    if (!to || !subject || !pdfBase64 || !filename || !reportType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    let acceptanceToken: string | null = null;
    let emailRecordId: string | null = null;

    if (includeAcceptance && quotationId) {
      const { data: emailRecord, error: emailError } = await supabase
        .from('quotation_emails')
        .insert({
          quotation_id: quotationId,
          sent_by: user.id,
          recipient_email: to,
          recipient_name: recipientName,
          report_type: reportType,
          subject: subject,
          message: message,
        })
        .select('id, acceptance_token')
        .single();

      if (emailError) {
        console.error('Error creating email record:', emailError);
      } else if (emailRecord) {
        acceptanceToken = emailRecord.acceptance_token;
        emailRecordId = emailRecord.id;
      }
    }

    const acceptanceUrl = acceptanceToken
      ? `${supabaseUrl.replace('supabase.co', 'supabase.co')}/accept/${acceptanceToken}`
      : null;

    const emailBody = `
      <html>
        <head>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .header {
              background: #15803d;
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 8px 8px 0 0;
            }
            .content {
              background: #f9fafb;
              padding: 30px;
              border: 1px solid #e5e7eb;
              border-radius: 0 0 8px 8px;
            }
            .info-box {
              background: white;
              padding: 15px;
              margin: 15px 0;
              border-left: 4px solid #15803d;
              border-radius: 4px;
            }
            .accept-button {
              display: inline-block;
              background: #15803d;
              color: white;
              padding: 14px 32px;
              text-decoration: none;
              border-radius: 8px;
              font-weight: 600;
              margin: 20px 0;
              text-align: center;
            }
            .accept-section {
              background: #ecfdf5;
              padding: 20px;
              margin: 20px 0;
              border-radius: 8px;
              border: 2px solid #15803d;
              text-align: center;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 14px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 style="margin: 0;">SCS Quotation Software</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Professional Quotation Report</p>
          </div>
          <div class="content">
            <h2 style="color: #15803d; margin-top: 0;">Report Delivery</h2>
            ${recipientName ? `<p>Dear ${recipientName},</p>` : ''}
            <p>Please find attached your ${reportName} from SCS Quotation Software.</p>

            ${jobNumber || customerName ? `
              <div class="info-box">
                <h3 style="margin-top: 0; color: #15803d;">Project Details:</h3>
                ${jobNumber ? `<p><strong>Job Number:</strong> ${jobNumber}</p>` : ''}
                ${customerName ? `<p><strong>Customer:</strong> ${customerName}</p>` : ''}
              </div>
            ` : ''}

            ${message ? `<p>${message.replace(/\n/g, '<br>')}</p>` : ''}

            <p>The PDF report is attached to this email and contains all the details of your quotation.</p>

            ${acceptanceUrl ? `
              <div class="accept-section">
                <h3 style="color: #15803d; margin-top: 0;">Electronic Acceptance</h3>
                <p>If you would like to accept this quotation, please click the button below to provide your electronic signature:</p>
                <a href="${acceptanceUrl}" class="accept-button">Accept Quotation</a>
                <p style="font-size: 14px; color: #6b7280; margin-top: 15px;">
                  This link is unique to this quotation and will record your acceptance securely.
                </p>
              </div>
            ` : ''}

            <p style="margin-top: 20px;">
              <strong>Note:</strong> All figures shown in the report are ex-VAT unless stated otherwise.
            </p>
          </div>
          <div class="footer">
            <p>Generated by SCS Quotation Software V1.0</p>
            <p>&copy; ${new Date().getFullYear()} SCS. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    console.log(`Sending email to: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Filename: ${filename}`);
    console.log(`Acceptance enabled: ${includeAcceptance}`);
    console.log(`Email record ID: ${emailRecordId}`);

    // Get email service configuration
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("FROM_EMAIL") || "onboarding@resend.dev";

    if (!resendApiKey) {
      console.warn("RESEND_API_KEY not configured. Email will not be sent.");
      return new Response(
        JSON.stringify({
          error: "Email service not configured. Please add RESEND_API_KEY to your Supabase Edge Function secrets.",
          details: "Contact your administrator to configure the email service."
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Send email via Resend API
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: emailBody,
        attachments: [
          {
            filename: filename,
            content: pdfBase64,
          },
        ],
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Failed to send email:", emailResult);

      // Update email record as failed if it was created
      if (emailRecordId) {
        await supabase
          .from('quotation_emails')
          .update({ sent_at: new Date().toISOString() })
          .eq('id', emailRecordId);
      }

      return new Response(
        JSON.stringify({
          error: "Failed to send email",
          details: emailResult.message || "Unknown error from email service"
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Update email record with sent timestamp
    if (emailRecordId) {
      await supabase
        .from('quotation_emails')
        .update({ sent_at: new Date().toISOString() })
        .eq('id', emailRecordId);
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Email sent to ${to}`,
        emailRecordId: emailRecordId,
        acceptanceToken: acceptanceToken,
        acceptanceUrl: acceptanceUrl,
        emailId: emailResult.id
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
