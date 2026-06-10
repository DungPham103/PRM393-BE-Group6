import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

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
    const mailOptions = {
      from: `"SportZone App" <${this.configService.get<string>('EMAIL_USER')}>`,
      to: toEmail,
      subject: 'Xác thực tài khoản SportZone',
      html: `
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
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email OTP sent successfully to ${toEmail}`);
    } catch (error) {
      this.logger.error(`Error sending email to ${toEmail}:`, error);
      throw new Error(
        'Không thể gửi email OTP, vui lòng kiểm tra lại cấu hình SMTP.',
      );
    }
  }
}
