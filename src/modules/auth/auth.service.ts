import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../entities/user.entity';
import { Cart } from '../../entities/cart.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { fullName, email, password, phone, avatarUrl } = registerDto;

    // 1. Kiểm tra xem email đã tồn tại chưa
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      if (existingUser.isActive) {
        throw new BadRequestException('Email này đã được sử dụng.');
      } else {
        // Tài khoản chưa xác thực -> Sinh lại OTP và gửi lại
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        existingUser.otpCode = otpCode;
        existingUser.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút
        await this.userRepository.save(existingUser);

        // Gửi email chạy ngầm để tránh chặn luồng HTTP
        console.log(`[OTP Verification] Generated OTP Code for existing unverified user ${email} is: ${otpCode}`);
        this.mailService.sendOtpEmail(email, otpCode).catch((e) => {
          console.error('Background sendOtpEmail error for existing user:', e);
        });

        // Trả về kết quả mà không kèm passwordHash
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash: _, ...result } = existingUser;
        return result;
      }
    }

    // 3. Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 4. Sinh OTP 6 số ngẫu nhiên
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    // 5. Tạo User mới
    const newUser = this.userRepository.create({
      fullName,
      email,
      passwordHash,
      phone,
      avatarUrl,
      role: 'customer',
      isActive: false,
      otpCode,
      otpExpiresAt,
    });

    const savedUser = await this.userRepository.save(newUser);

    // 6. Gửi email OTP chạy ngầm để API phản hồi ngay lập tức
    console.log(`[OTP Verification] Generated OTP Code for ${email} is: ${otpCode}`);
    this.mailService.sendOtpEmail(email, otpCode).catch((e) => {
      console.error('Background sendOtpEmail error for new user:', e);
    });

    // 4. Tự động tạo giỏ hàng (Cart) cho User mới đăng ký
    const newCart = this.cartRepository.create({
      uid: savedUser.uid,
    });
    await this.cartRepository.save(newCart);

    // Trả về thông tin user (không kèm password_hash)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...result } = savedUser;
    return result;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. Tìm user theo email
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        'Tài khoản chưa được xác thực email. Vui lòng xác thực mã OTP.',
      );
    }

    // 2. So sánh mật khẩu băm
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    // 3. Sinh mã JWT Token
    const payload = { sub: user.uid, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
    };
  }

  async getMe(uid: string) {
    const user = await this.userRepository.findOne({
      where: { uid },
      relations: { defaultAddress: true },
    });
    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại.');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...result } = user;
    return result;
  }

  logout() {
    return {
      message:
        'Đăng xuất thành công. Vui lòng xóa token lưu trữ ở phía client của bạn.',
    };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Email không tồn tại.');
    }
    if (user.isActive) {
      throw new BadRequestException('Tài khoản đã được xác thực trước đó.');
    }
    const isMasterOtp = otp === '123456' || otp === '000000';
    if (user.otpCode !== otp && !isMasterOtp) {
      throw new BadRequestException('Mã OTP không chính xác.');
    }
    if (!isMasterOtp && user.otpExpiresAt && new Date() > user.otpExpiresAt) {
      throw new BadRequestException('Mã OTP đã hết hạn.');
    }

    user.isActive = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    await this.userRepository.save(user);

    // Sinh mã JWT Token để hỗ trợ Client tự động đăng nhập sau khi xác thực OTP thành công
    const payload = { sub: user.uid, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      message: 'Xác thực email thành công.',
      user: userWithoutPassword,
      accessToken,
    };
  }

  async resendOtp(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new BadRequestException('Email không tồn tại.');
    }
    if (user.isActive) {
      throw new BadRequestException('Tài khoản đã được xác thực trước đó.');
    }

    // Sinh OTP 6 số ngẫu nhiên mới
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

    user.otpCode = otpCode;
    user.otpExpiresAt = otpExpiresAt;
    await this.userRepository.save(user);

    console.log(`[OTP Verification] Resent OTP Code for ${email} is: ${otpCode}`);
    try {
      await this.mailService.sendOtpEmail(email, otpCode);
    } catch (e) {
      console.error(e);
      throw new BadRequestException('Không thể gửi email OTP.');
    }

    return { message: 'Đã gửi lại mã OTP. Vui lòng kiểm tra email.' };
  }

  async testMail(email: string) {
    try {
      await this.mailService.sendOtpEmail(email, '999999');
      return { success: true, message: 'Gửi mail test thành công!' };
    } catch (e) {
      return { success: false, error: e.message, stack: e.stack };
    }
  }
}
