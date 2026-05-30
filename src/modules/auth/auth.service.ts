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

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { fullName, email, password, phone, avatarUrl } = registerDto;

    // 1. Kiểm tra xem email đã tồn tại chưa
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new BadRequestException('Email này đã được sử dụng.');
    }

    // 2. Mã hóa mật khẩu
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // 3. Tạo User mới
    const newUser = this.userRepository.create({
      fullName,
      email,
      passwordHash,
      phone,
      avatarUrl,
      role: 'customer', // Mặc định là khách hàng
    });

    const savedUser = await this.userRepository.save(newUser);

    // 4. Tự động tạo giỏ hàng (Cart) cho User mới đăng ký
    const newCart = this.cartRepository.create({
      uid: savedUser.uid,
    });
    await this.cartRepository.save(newCart);

    // Trả về thông tin user (không kèm password_hash)
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
      throw new UnauthorizedException('Tài khoản này đang bị tạm khóa.');
    }

    // 2. So sánh mật khẩu băm
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác.');
    }

    // 3. Sinh mã JWT Token
    const payload = { sub: user.uid, email: user.email, role: user.role };
    const accessToken = await this.jwtService.signAsync(payload);

    const { passwordHash: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      accessToken,
    };
  }
}
