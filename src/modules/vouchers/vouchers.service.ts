import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { Voucher, DiscountType, MembershipTier } from '../../entities/voucher.entity';
import { UserVoucher } from '../../entities/user-voucher.entity';
import { User } from '../../entities/user.entity';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../../entities/notification.entity';

// Thứ tự bậc từ thấp đến cao
const TIER_ORDER: MembershipTier[] = [
  MembershipTier.BRONZE,
  MembershipTier.SILVER,
  MembershipTier.GOLD,
  MembershipTier.PLATINUM,
];

// Ngưỡng nâng bậc (tổng tiền đơn hàng đã completed)
export const TIER_THRESHOLDS: Record<MembershipTier, number> = {
  [MembershipTier.BRONZE]: 0,
  [MembershipTier.SILVER]: 2000000,
  [MembershipTier.GOLD]: 5000000,
  [MembershipTier.PLATINUM]: 10000000,
};

@Injectable()
export class VouchersService {
  constructor(
    @InjectRepository(Voucher)
    private voucherRepository: Repository<Voucher>,
    @InjectRepository(UserVoucher)
    private userVoucherRepository: Repository<UserVoucher>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Admin: Tạo voucher mới ───
  async createVoucher(dto: CreateVoucherDto) {
    // Kiểm tra code đã tồn tại chưa
    const existing = await this.voucherRepository.findOne({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new BadRequestException(`Mã voucher "${dto.code}" đã tồn tại.`);
    }

    const voucher = this.voucherRepository.create({
      code: dto.code.toUpperCase(),
      description: dto.description,
      discountType: dto.discountType,
      discountValue: dto.discountValue,
      maxDiscount: dto.maxDiscount,
      minOrderValue: dto.minOrderValue ?? 0,
      targetTier: dto.targetTier,
      usageLimit: dto.usageLimit,
      startsAt: dto.startsAt ? new Date(dto.startsAt) : new Date(),
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      isActive: dto.isActive ?? true,
    });

    const savedVoucher = await this.voucherRepository.save(voucher);

    // Gửi notification cho tất cả user có bậc >= targetTier
    await this.notifyEligibleUsers(savedVoucher);

    return savedVoucher;
  }

  // ─── Admin: Sửa voucher ───
  async updateVoucher(voucherId: string, dto: UpdateVoucherDto) {
    const voucher = await this.voucherRepository.findOne({
      where: { voucherId },
    });
    if (!voucher) {
      throw new NotFoundException('Không tìm thấy voucher.');
    }

    if (dto.code) {
      const existing = await this.voucherRepository.findOne({
        where: { code: dto.code.toUpperCase() },
      });
      if (existing && existing.voucherId !== voucherId) {
        throw new BadRequestException(`Mã voucher "${dto.code}" đã tồn tại.`);
      }
      voucher.code = dto.code.toUpperCase();
    }

    if (dto.description !== undefined) voucher.description = dto.description;
    if (dto.discountType !== undefined) voucher.discountType = dto.discountType;
    if (dto.discountValue !== undefined) voucher.discountValue = dto.discountValue;
    if (dto.maxDiscount !== undefined) voucher.maxDiscount = dto.maxDiscount;
    if (dto.minOrderValue !== undefined) voucher.minOrderValue = dto.minOrderValue;
    if (dto.targetTier !== undefined) voucher.targetTier = dto.targetTier;
    if (dto.usageLimit !== undefined) voucher.usageLimit = dto.usageLimit;
    if (dto.startsAt !== undefined) voucher.startsAt = new Date(dto.startsAt);
    if (dto.expiresAt !== undefined) voucher.expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : null;
    if (dto.isActive !== undefined) voucher.isActive = dto.isActive;

    return this.voucherRepository.save(voucher);
  }

  // ─── Admin: Xóa voucher (soft delete) ───
  async deleteVoucher(voucherId: string) {
    const voucher = await this.voucherRepository.findOne({
      where: { voucherId },
    });
    if (!voucher) {
      throw new NotFoundException('Không tìm thấy voucher.');
    }
    voucher.isActive = false;
    await this.voucherRepository.save(voucher);
    return { message: 'Đã vô hiệu hóa voucher.' };
  }

  // ─── Admin: Lấy tất cả vouchers ───
  async getAllVouchers() {
    return this.voucherRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  // ─── User: Lấy voucher khả dụng theo bậc ───
  async getAvailableVouchers(uid: string) {
    const user = await this.userRepository.findOne({ where: { uid } });
    if (!user) throw new NotFoundException('User không tồn tại.');

    const userTierIndex = TIER_ORDER.indexOf(user.membershipTier as MembershipTier);

    // Lấy tất cả bậc mà user đủ điều kiện (từ bronze đến bậc hiện tại)
    const eligibleTiers = TIER_ORDER.slice(0, userTierIndex + 1);

    const now = new Date();

    // Lấy voucher active, đúng tier, trong thời gian hiệu lực
    const vouchers = await this.voucherRepository
      .createQueryBuilder('v')
      .where('v.is_active = :active', { active: true })
      .andWhere('v.target_tier IN (:...tiers)', { tiers: eligibleTiers })
      .andWhere('v.starts_at <= :now', { now })
      .andWhere('(v.expires_at IS NULL OR v.expires_at >= :now)', { now })
      .andWhere('(v.usage_limit IS NULL OR v.used_count < v.usage_limit)')
      .orderBy('v.created_at', 'DESC')
      .getMany();

    // Lấy danh sách voucher user đã dùng
    const usedVouchers = await this.userVoucherRepository.find({
      where: { uid },
      select: { voucherId: true },
    });
    const usedVoucherIds = new Set(usedVouchers.map((uv) => uv.voucherId));

    // Trả về kèm trạng thái đã dùng hay chưa
    return vouchers.map((v) => ({
      ...v,
      isUsed: usedVoucherIds.has(v.voucherId),
    }));
  }

  // ─── User: Validate & tính discount cho voucher ───
  async validateAndCalculateDiscount(
    code: string,
    uid: string,
    subtotal: number,
  ): Promise<{ voucher: Voucher; discountAmount: number }> {
    const voucher = await this.voucherRepository.findOne({
      where: { code: code.toUpperCase(), isActive: true },
    });

    if (!voucher) {
      throw new BadRequestException('Mã voucher không tồn tại hoặc đã hết hạn.');
    }

    const now = new Date();
    if (voucher.startsAt > now) {
      throw new BadRequestException('Voucher chưa đến thời gian sử dụng.');
    }
    if (voucher.expiresAt && voucher.expiresAt < now) {
      throw new BadRequestException('Voucher đã hết hạn.');
    }
    if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
      throw new BadRequestException('Voucher đã hết lượt sử dụng.');
    }

    // Kiểm tra user đã dùng voucher này chưa
    const used = await this.userVoucherRepository.findOne({
      where: { uid, voucherId: voucher.voucherId },
    });
    if (used) {
      throw new BadRequestException('Bạn đã sử dụng voucher này rồi.');
    }

    // Kiểm tra bậc thành viên
    const user = await this.userRepository.findOne({ where: { uid } });
    if (!user) throw new NotFoundException('User không tồn tại.');

    const userTierIndex = TIER_ORDER.indexOf(user.membershipTier as MembershipTier);
    const requiredTierIndex = TIER_ORDER.indexOf(voucher.targetTier);

    if (userTierIndex < requiredTierIndex) {
      throw new BadRequestException(
        `Voucher này yêu cầu bậc ${voucher.targetTier.toUpperCase()}. Bậc hiện tại: ${user.membershipTier.toUpperCase()}.`,
      );
    }

    // Kiểm tra giá trị đơn tối thiểu
    if (subtotal < Number(voucher.minOrderValue)) {
      throw new BadRequestException(
        `Đơn hàng tối thiểu ${Number(voucher.minOrderValue).toLocaleString('vi-VN')}₫ để sử dụng voucher này.`,
      );
    }

    // Tính giảm giá
    let discountAmount: number;
    if (voucher.discountType === DiscountType.PERCENTAGE) {
      discountAmount = Math.floor(subtotal * Number(voucher.discountValue) / 100);
      if (voucher.maxDiscount) {
        discountAmount = Math.min(discountAmount, Number(voucher.maxDiscount));
      }
    } else {
      discountAmount = Number(voucher.discountValue);
    }

    // Giảm không được lớn hơn subtotal
    discountAmount = Math.min(discountAmount, subtotal);

    return { voucher, discountAmount };
  }

  // ─── Đánh dấu voucher đã sử dụng ───
  async markVoucherUsed(uid: string, voucherId: string, orderId: string) {
    const userVoucher = this.userVoucherRepository.create({
      uid,
      voucherId,
      orderId,
    });
    await this.userVoucherRepository.save(userVoucher);

    // Tăng used_count
    await this.voucherRepository.increment({ voucherId }, 'usedCount', 1);
  }

  // ─── Kiểm tra & nâng bậc thành viên ───
  async checkAndUpgradeTier(uid: string): Promise<string | null> {
    const user = await this.userRepository.findOne({ where: { uid } });
    if (!user) return null;

    const totalSpent = Number(user.totalSpent);
    let newTier = MembershipTier.BRONZE;

    // Duyệt từ cao xuống thấp để tìm bậc phù hợp
    for (let i = TIER_ORDER.length - 1; i >= 0; i--) {
      if (totalSpent >= TIER_THRESHOLDS[TIER_ORDER[i]]) {
        newTier = TIER_ORDER[i];
        break;
      }
    }

    if (newTier !== user.membershipTier) {
      const oldTier = user.membershipTier;
      user.membershipTier = newTier;
      await this.userRepository.save(user);

      // Gửi notification nâng bậc
      const tierNames: Record<string, string> = {
        bronze: 'Bronze 🥉',
        silver: 'Silver 🥈',
        gold: 'Gold 🥇',
        platinum: 'Platinum 💎',
      };

      await this.notificationsService.createNotification({
        uid,
        type: NotificationType.SYSTEM,
        title: `Chúc mừng! Bạn đã lên bậc ${tierNames[newTier]}`,
        body: `Bạn đã chi tổng cộng ${totalSpent.toLocaleString('vi-VN')}₫ và được nâng lên bậc ${tierNames[newTier]}. Hãy kiểm tra voucher mới dành cho bạn!`,
      });

      return newTier;
    }

    return null;
  }

  // ─── Gửi notification cho user đủ điều kiện nhận voucher mới ───
  private async notifyEligibleUsers(voucher: Voucher) {
    const targetTierIndex = TIER_ORDER.indexOf(voucher.targetTier);
    const eligibleTiers = TIER_ORDER.slice(targetTierIndex);

    const users = await this.userRepository.find({
      where: { membershipTier: In(eligibleTiers), isActive: true },
      select: { uid: true },
    });

    const tierNames: Record<string, string> = {
      bronze: 'Bronze',
      silver: 'Silver',
      gold: 'Gold',
      platinum: 'Platinum',
    };

    const discountText =
      voucher.discountType === DiscountType.PERCENTAGE
        ? `${voucher.discountValue}%${voucher.maxDiscount ? ` (tối đa ${Number(voucher.maxDiscount).toLocaleString('vi-VN')}₫)` : ''}`
        : `${Number(voucher.discountValue).toLocaleString('vi-VN')}₫`;

    for (const user of users) {
      await this.notificationsService.createNotification({
        uid: user.uid,
        type: NotificationType.NEW_VOUCHER,
        title: `🎉 Voucher mới: ${voucher.code}`,
        body: `Giảm ${discountText} dành cho thành viên ${tierNames[voucher.targetTier]}+. Mã: ${voucher.code}. ${voucher.description || ''}`.trim(),
        refId: voucher.voucherId,
        refType: 'voucher',
      });
    }
  }
}
