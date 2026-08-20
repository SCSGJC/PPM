# Send Report Email Edge Function

This Supabase Edge Function enables email delivery of quotation reports as PDF attachments.

## Deployment

This function needs to be deployed to your Supabase project. You have two options:

### Option 1: Deploy via Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to Edge Functions
3. Create a new function named `send-report-email`
4. Copy the contents of `index.ts` into the function editor
5. Deploy the function

### Option 2: Deploy via Supabase CLI

```bash
# Login to Supabase
npx supabase login

# Deploy the function
npx supabase functions deploy send-report-email
```

## Email Service Integration

The current implementation provides a basic structure. To actually send emails, you need to integrate with an email service. Here are recommended options:

### Option A: Resend (Recommended)

```typescript
// Add to your edge function
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const response = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: 'reports@yourdomain.com',
    to: [to],
    subject: subject,
    html: emailBody,
    attachments: [{
      filename: filename,
      content: pdfBase64,
    }],
  }),
});
```

### Option B: SendGrid

```typescript
// Add to your edge function
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');

const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${SENDGRID_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    personalizations: [{ to: [{ email: to }] }],
    from: { email: 'reports@yourdomain.com' },
    subject: subject,
    content: [{ type: 'text/html', value: emailBody }],
    attachments: [{
      content: pdfBase64,
      filename: filename,
      type: 'application/pdf',
      disposition: 'attachment',
    }],
  }),
});
```

### Option C: AWS SES

Use the AWS SDK for Deno to integrate with AWS Simple Email Service.

## Environment Variables

Set these environment variables in your Supabase project settings:

- `RESEND_API_KEY` or `SENDGRID_API_KEY` - Your email service API key
- `FROM_EMAIL` - The sender email address

## Testing

Test the function locally:

```bash
npx supabase functions serve send-report-email
```

Then send a test request:

```bash
curl -X POST http://localhost:54321/functions/v1/send-report-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Report",
    "reportName": "Client Proposal",
    "jobNumber": "TEST-001",
    "customerName": "Test Customer",
    "pdfBase64": "...",
    "filename": "test-report.pdf"
  }'
```

## Security

- The function includes CORS headers for browser access
- Authentication is handled via Supabase Auth tokens
- Rate limiting should be configured in production
- Consider implementing email address validation and spam prevention

## JWT Verification

**IMPORTANT**: This function should be deployed with JWT verification **DISABLED** (`verify_jwt: false`).

The function handles authentication through its own logic and needs flexibility for various calling patterns.

## Support

For issues or questions, refer to the Supabase Edge Functions documentation:
https://supabase.com/docs/guides/functions
