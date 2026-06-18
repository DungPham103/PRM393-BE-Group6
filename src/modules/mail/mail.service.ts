import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as dns from 'dns';

// Ép Node.js ưu tiên IPv4 để tránh lỗi kết nối IPv6 (ENETUNREACH) trên Render
dns.setDefaultResultOrder('ipv4first');

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get<string>('EMAIL_USER', 'abc@gmail.com'),
        pass: this.configService.get<string>(
          'EMAIL_PASS',
          'gxew mkei lish nrec',
        ),
      },
    });
  }

  async sendOtpEmail(toEmail: string, otpCode: string): Promise<void> {
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    const emailUser = this.configService.get<string>('EMAIL_USER');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #000; text-align: center;">Chào mừng đến với SportZone</h2>
        <p style="color: #333; font-size: 16px;">Mã xác thực OTP của bạn là:</p>
        <div style="text-align: center; margin: 20px 0;">
          <span style="display: inline-block; padding: 15px 30px; font-size: 24px; font-weight: bold; background-color: #D5FF44; color: #000; border-radius: 8px; letter-spacing: 5px;">
            ${otpCode}
          </span>
        </div>
        <p style="color: #333; font-size: 14px;">Mã này sẽ hết hạn sau 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="color: #888; font-size: 12px; text-align: center;">Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>
      </div>
    `;

    // 1. Nếu cấu hình RESEND_API_KEY -> Gửi qua API HTTP của Resend
    if (resendApiKey) {
      this.logger.log(`Attempting to send OTP email to ${toEmail} using Resend API...`);
      try {
        // Mặc định dùng onboarding@resend.dev của Resend Sandbox nếu chưa cấu hình EMAIL_FROM/EMAIL_USER
        const fromEmail = this.configService.get<string>('EMAIL_FROM') || 'onboarding@resend.dev';
        
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `SportZone App <${fromEmail}>`,
            to: toEmail,
            subject: 'Xác thực tài khoản SportZone',
            html: htmlContent,
          }),
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error(
            errBody.message || `HTTP Error ${response.status}: ${JSON.stringify(errBody)}`,
          );
        }

        this.logger.log(`Email OTP sent successfully via Resend API to ${toEmail}`);
        return;
      } catch (error) {
        this.logger.error(`Error sending email via Resend to ${toEmail}:`, error);
        throw new Error(
          `Không thể gửi email OTP qua Resend API. Chi tiết: ${error.message || error}`,
        );
      }
    }

    // 2. Chế độ Fallback: Gửi qua Nodemailer SMTP (Dùng ở máy Local)
    this.logger.log(`Attempting to send OTP email to ${toEmail} using Nodemailer SMTP...`);
    const mailOptions = {
      from: `"SportZone App" <${emailUser}>`,
      to: toEmail,
      subject: 'Xác thực tài khoản SportZone',
      html: htmlContent,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email OTP sent successfully via SMTP to ${toEmail}`);
    } catch (error) {
      this.logger.error(`Error sending email via SMTP to ${toEmail}:`, error);
      throw new Error(
        `Không thể gửi email OTP qua SMTP. Lỗi SMTP gốc: ${error.message || error}`,
      );
    }
  }
}
