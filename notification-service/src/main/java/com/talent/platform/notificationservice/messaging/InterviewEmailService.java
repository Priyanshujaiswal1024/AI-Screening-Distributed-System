package com.talent.platform.notificationservice.messaging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.internet.MimeMessage;

/**
 * Sends beautifully designed HTML emails for interview invitations.
 * Real-world professional quality — not plain text.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InterviewEmailService {

    private final JavaMailSender mailSender;

    /**
     * Send a professional HTML interview invitation email to the candidate.
     */
    public void sendInterviewInvite(
            String candidateEmail,
            String candidateName,
            String jobTitle,
            String companyName,
            String recruiterName,
            String recruiterEmail,
            String interviewDate,
            String interviewTime,
            String interviewMode,
            String meetingLink,
            String notes,
            String interviewId) {

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("priyanshjais123@gmail.com", companyName + " Talent Team");
            helper.setTo(candidateEmail);
            helper.setSubject("🎉 Interview Invitation — " + jobTitle + " at " + companyName);

            String html = buildInterviewInviteHtml(
                    candidateName, jobTitle, companyName, recruiterName,
                    recruiterEmail, interviewDate, interviewTime,
                    interviewMode, meetingLink, notes, interviewId);

            helper.setText(html, true);
            mailSender.send(message);

            log.info("[InterviewEmailService] Interview invite sent to={} for job='{}'", candidateEmail, jobTitle);

        } catch (Exception e) {
            log.error("[InterviewEmailService] Failed to send interview invite to={}: {}", candidateEmail, e.getMessage());
            throw new RuntimeException("Interview invite email delivery failed: " + e.getMessage(), e);
        }
    }

    /**
     * Notify the recruiter when a candidate confirms or requests reschedule.
     */
    public void sendStatusUpdateToRecruiter(
            String recruiterEmail,
            String candidateName,
            String jobTitle,
            String status) {

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("priyanshjais123@gmail.com", "Talent Intelligence Platform");
            helper.setTo(recruiterEmail);

            String emoji = status.equals("CONFIRMED") ? "✅" : "🔄";
            String action = status.equals("CONFIRMED") ? "confirmed their interview" : "requested a reschedule";

            helper.setSubject(emoji + " " + candidateName + " has " + action + " — " + jobTitle);
            helper.setText(buildStatusUpdateHtml(candidateName, jobTitle, status, recruiterEmail), true);

            mailSender.send(message);
            log.info("[InterviewEmailService] Status update sent to recruiter={} status={}", recruiterEmail, status);

        } catch (Exception e) {
            log.error("[InterviewEmailService] Failed to send status update: {}", e.getMessage());
        }
    }

    /**
     * Send a cancellation email to the candidate.
     */
    public void sendCancellationEmail(
            String candidateEmail,
            String candidateName,
            String jobTitle,
            String companyName) {

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom("priyanshjais123@gmail.com", companyName + " Talent Team");
            helper.setTo(candidateEmail);
            helper.setSubject("❌ Interview Cancelled — " + jobTitle + " at " + companyName);

            String html = buildCancellationHtml(candidateName, jobTitle, companyName);
            helper.setText(html, true);
            mailSender.send(message);

            log.info("[InterviewEmailService] Cancellation email sent to={} for job='{}'", candidateEmail, jobTitle);

        } catch (Exception e) {
            log.error("[InterviewEmailService] Failed to send cancellation email to={}: {}", candidateEmail, e.getMessage());
        }
    }

    // ─────────────────────────────── HTML Templates ───────────────────────────────

    private String buildInterviewInviteHtml(
            String candidateName, String jobTitle, String companyName,
            String recruiterName, String recruiterEmail,
            String interviewDate, String interviewTime,
            String interviewMode, String meetingLink, String notes,
            String interviewId) {

        String modeIcon = switch (interviewMode != null ? interviewMode : "ONLINE") {
            case "IN_PERSON" -> "🏢";
            case "HYBRID"    -> "🔀";
            default          -> "💻";
        };

        String modeLabel = switch (interviewMode != null ? interviewMode : "ONLINE") {
            case "IN_PERSON" -> "In-Person";
            case "HYBRID"    -> "Hybrid";
            default          -> "Online / Virtual";
        };

        String meetingSection = "";
        if (meetingLink != null && !meetingLink.isBlank()) {
            meetingSection = """
                <tr>
                  <td style="padding: 6px 0;">
                    <span style="display:inline-block;width:130px;font-weight:600;color:#64748b;">Meeting Link</span>
                    <a href="%s" style="color:#6366f1;text-decoration:none;font-weight:600;">Join Meeting →</a>
                  </td>
                </tr>
            """.formatted(meetingLink);
        }

        String notesSection = "";
        if (notes != null && !notes.isBlank()) {
            notesSection = """
                <div style="margin-top:24px;padding:16px;background:#f8fafc;border-left:4px solid #6366f1;border-radius:4px;">
                  <p style="margin:0;font-size:14px;color:#64748b;font-weight:600;margin-bottom:6px;">📌 Additional Notes</p>
                  <p style="margin:0;font-size:14px;color:#374151;">%s</p>
                </div>
            """.formatted(notes);
        }

        String firstName = candidateName != null && candidateName.contains(" ")
                ? candidateName.split(" ")[0]
                : candidateName;

        return """
            <!DOCTYPE html>
            <html lang="en">
            <head>
              <meta charset="UTF-8"/>
              <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
              <title>Interview Invitation</title>
            </head>
            <body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
            
              <!-- Wrapper -->
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
                <tr><td align="center">
            
                  <!-- Card -->
                  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;">
            
                    <!-- Header Banner -->
                    <tr>
                      <td style="background:linear-gradient(135deg,#4f46e5 0%%,#7c3aed 50%%,#6366f1 100%%);padding:40px 40px 32px;text-align:center;">
                        <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:50%%;width:56px;height:56px;line-height:56px;font-size:28px;margin-bottom:16px;">🚀</div>
                        <h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;letter-spacing:-0.5px;">
                          You're Shortlisted!
                        </h1>
                        <p style="margin:10px 0 0;color:rgba(255,255,255,0.85);font-size:15px;">
                          Congratulations on making it to the next round
                        </p>
                      </td>
                    </tr>
            
                    <!-- Body -->
                    <tr>
                      <td style="padding:36px 40px;">
            
                        <!-- Greeting -->
                        <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1e293b;">
                          Dear %s, 👋
                        </p>
                        <p style="margin:0 0 28px;font-size:15px;color:#475569;line-height:1.6;">
                          We are delighted to inform you that your resume has been reviewed and you have been 
                          <strong style="color:#4f46e5;">shortlisted for an interview</strong> for the position below. 
                          Please review the interview details carefully.
                        </p>
            
                        <!-- Position Badge -->
                        <div style="background:linear-gradient(135deg,#ede9fe,#e0e7ff);border-radius:12px;padding:20px 24px;margin-bottom:28px;border:1px solid #c7d2fe;">
                          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:1px;">Position</p>
                          <p style="margin:0;font-size:20px;font-weight:700;color:#1e293b;">%s</p>
                          <p style="margin:4px 0 0;font-size:14px;color:#64748b;">%s</p>
                        </div>
            
                        <!-- Interview Details Card -->
                        <div style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:28px;border:1px solid #e2e8f0;">
                          <p style="margin:0 0 16px;font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:1px;">📋 Interview Details</p>
                          <table cellpadding="0" cellspacing="0" style="width:100%%;">
                            <tr>
                              <td style="padding: 8px 0;border-bottom:1px solid #e2e8f0;">
                                <span style="display:inline-block;width:130px;font-weight:600;color:#64748b;font-size:14px;">📅 Date</span>
                                <span style="font-size:14px;font-weight:700;color:#1e293b;">%s</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;border-bottom:1px solid #e2e8f0;">
                                <span style="display:inline-block;width:130px;font-weight:600;color:#64748b;font-size:14px;">🕐 Time</span>
                                <span style="font-size:14px;font-weight:700;color:#1e293b;">%s</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 8px 0;border-bottom:1px solid #e2e8f0;">
                                <span style="display:inline-block;width:130px;font-weight:600;color:#64748b;font-size:14px;">%s Mode</span>
                                <span style="font-size:14px;font-weight:700;color:#1e293b;">%s</span>
                              </td>
                            </tr>
                            %s
                          </table>
                        </div>
            
                        %s
            
                        <!-- Action Required -->
                        <div style="text-align:center;margin:32px 0 8px;">
                          <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#1e293b;">Action Required:</p>
                          <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
                            Please <strong>reply directly to this email</strong> to confirm your attendance.
                          </p>
                          <div style="display:inline-block;background:#fff7ed;color:#c2410c;padding:10px 16px;border-radius:6px;font-size:13px;border:1px solid #ffedd5;">
                            ⚠️ If we do not hear from you within <strong>7 days</strong>, this invitation will automatically expire.
                          </div>
                        </div>
            
                        <!-- Divider -->
                        <hr style="border:none;border-top:1px solid #e2e8f0;margin:28px 0;"/>
            
                        <!-- Recruiter Info -->
                        <div style="display:flex;align-items:center;">
                          <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:50%%;width:44px;height:44px;line-height:44px;text-align:center;font-size:18px;font-weight:700;color:#fff;display:inline-block;margin-right:14px;vertical-align:middle;">
                            %s
                          </div>
                          <div style="display:inline-block;vertical-align:middle;margin-left:12px;">
                            <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b;">%s</p>
                            <p style="margin:2px 0 0;font-size:13px;color:#64748b;">%s · %s</p>
                          </div>
                        </div>
            
                        <p style="margin:24px 0 0;font-size:13px;color:#94a3b8;line-height:1.5;">
                          If you have any questions or need assistance, please reply to this email or contact your recruiter directly.
                          We wish you the very best for your interview! 🌟
                        </p>
            
                      </td>
                    </tr>
            
                    <!-- Footer -->
                    <tr>
                      <td style="background:#1e293b;padding:24px 40px;text-align:center;">
                        <p style="margin:0 0 6px;font-size:16px;font-weight:700;color:#ffffff;">
                          🧠 Talent Intelligence Platform
                        </p>
                        <p style="margin:0;font-size:12px;color:#94a3b8;">
                          Powered by AI • Connecting Top Talent with Great Opportunities
                        </p>
                        <p style="margin:12px 0 0;font-size:11px;color:#64748b;">
                          This is an automated message. Please do not reply directly to this email.
                          <br/>© 2026 Talent Intelligence Platform. All rights reserved.
                        </p>
                      </td>
                    </tr>
            
                  </table>
            
                </td></tr>
              </table>
            
            </body>
            </html>
            """.formatted(
                firstName,
                jobTitle, companyName,
                interviewDate, interviewTime,
                modeIcon, modeLabel,
                meetingSection,
                notesSection,
                recruiterName != null && !recruiterName.isBlank()
                    ? String.valueOf(recruiterName.charAt(0)).toUpperCase()
                    : "R",
                recruiterName, "Talent Recruiter", companyName
        );
    }

    private String buildStatusUpdateHtml(String candidateName, String jobTitle, String status, String recruiterEmail) {
        boolean isConfirmed = "CONFIRMED".equals(status);
        String emoji     = isConfirmed ? "✅" : "🔄";
        String headline  = isConfirmed
                ? candidateName + " has confirmed their interview!"
                : candidateName + " has requested a reschedule";
        String subText   = isConfirmed
                ? "Great news! The candidate is confirmed and ready for the interview."
                : "The candidate has requested a different time slot. Please reach out to reschedule.";
        String color     = isConfirmed ? "#10b981" : "#f59e0b";

        return """
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="UTF-8"/></head>
            <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
                <tr><td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:560px;">
                    <tr>
                      <td style="background:%s;padding:32px;text-align:center;">
                        <div style="font-size:48px;margin-bottom:12px;">%s</div>
                        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">%s</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:32px 36px;">
                        <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">%s</p>
                        <div style="background:#f8fafc;border-radius:10px;padding:16px 20px;margin:16px 0;">
                          <p style="margin:0;font-size:14px;color:#64748b;"><strong>Position:</strong> %s</p>
                          <p style="margin:6px 0 0;font-size:14px;color:#64748b;"><strong>Candidate:</strong> %s</p>
                        </div>
                        <p style="margin:16px 0 0;font-size:13px;color:#94a3b8;">
                          Please log in to the Talent Intelligence Platform to take the next steps.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#1e293b;padding:20px;text-align:center;">
                        <p style="margin:0;font-size:13px;color:#94a3b8;">© 2026 Talent Intelligence Platform</p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(color, emoji, headline, subText, jobTitle, candidateName);
    }

    private String buildCancellationHtml(String candidateName, String jobTitle, String companyName) {
        String firstName = candidateName != null && candidateName.contains(" ")
                ? candidateName.split(" ")[0]
                : candidateName;

        return """
            <!DOCTYPE html>
            <html lang="en">
            <head><meta charset="UTF-8"/></head>
            <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
              <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
                <tr><td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:560px;">
                    <tr>
                      <td style="background:#f43f5e;padding:32px;text-align:center;">
                        <div style="font-size:48px;margin-bottom:12px;">❌</div>
                        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">Interview Cancelled</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:32px 36px;">
                        <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1e293b;">Dear %s,</p>
                        <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
                          We are writing to inform you that your upcoming interview for the <strong>%s</strong> position at <strong>%s</strong> has been cancelled.
                        </p>
                        <p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6;">
                          If this was done in error or if we plan to reschedule, the recruiting team will reach out to you shortly with next steps.
                        </p>
                        <p style="margin:24px 0 0;font-size:15px;color:#475569;">
                          Best regards,<br/>
                          <strong>The %s Team</strong>
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="background:#1e293b;padding:20px;text-align:center;">
                        <p style="margin:0;font-size:12px;color:#94a3b8;">
                          This is an automated message. Please do not reply directly to this email.<br/>
                          © 2026 %s
                        </p>
                      </td>
                    </tr>
                  </table>
                </td></tr>
              </table>
            </body>
            </html>
            """.formatted(firstName, jobTitle, companyName, companyName, companyName);
    }
}
