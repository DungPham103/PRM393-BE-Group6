import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Address } from '../../entities/address.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
  ) {}

  async getUserProfile(requestUid: string, targetUid: string) {
    if (requestUid !== targetUid) {
      throw new ForbiddenException(
        'Bạn không có quyền xem profile người khác.',
      );
    }
    const user = await this.userRepository.findOne({
      where: { uid: targetUid },
      relations: { defaultAddress: true },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại.');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = user;
    return result;
  }

  async updateUserProfile(
    requestUid: string,
    targetUid: string,
    dto: UpdateUserDto,
  ) {
    if (requestUid !== targetUid) {
      throw new ForbiddenException(
        'Bạn không có quyền chỉnh sửa profile người khác.',
      );
    }
    const user = await this.userRepository.findOne({
      where: { uid: targetUid },
    });
    if (!user) throw new NotFoundException('Người dùng không tồn tại.');

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.phone !== undefined) user.phone = dto.phone;
    if (dto.avatarUrl !== undefined) user.avatarUrl = dto.avatarUrl;

    const saved = await this.userRepository.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...result } = saved;
    return result;
  }

  async getAddresses(requestUid: string, targetUid: string) {
    if (requestUid !== targetUid) {
      throw new ForbiddenException(
        'Bạn không có quyền xem địa chỉ người khác.',
      );
    }
    return this.addressRepository.find({
      where: { uid: targetUid },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async createAddress(
    requestUid: string,
    targetUid: string,
    dto: CreateAddressDto,
  ) {
    if (requestUid !== targetUid) {
      throw new ForbiddenException(
        'Bạn không có quyền tạo địa chỉ cho người khác.',
      );
    }

    // Nếu đặt là mặc định, bỏ mặc định của các địa chỉ cũ
    if (dto.isDefault) {
      await this.addressRepository.update(
        { uid: targetUid, isDefault: true },
        { isDefault: false },
      );
    }

    const address = this.addressRepository.create({
      uid: targetUid,
      recipientName: dto.recipientName,
      phone: dto.phone,
      street: dto.street,
      ward: dto.ward,
      district: dto.district,
      city: dto.city || 'TP. Hồ Chí Minh',
      isDefault: dto.isDefault ?? false,
    });

    const saved = await this.addressRepository.save(address);

    // Nếu là địa chỉ mặc định, cập nhật vào bảng users
    if (saved.isDefault) {
      await this.userRepository.update(targetUid, {
        defaultAddressId: saved.addressId,
      });
    }

    return saved;
  }

  async updateAddress(
    requestUid: string,
    addressId: string,
    dto: UpdateAddressDto,
  ) {
    const address = await this.addressRepository.findOne({
      where: { addressId },
    });
    if (!address) throw new NotFoundException('Địa chỉ không tồn tại.');
    if (address.uid !== requestUid) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa địa chỉ này.');
    }

    if (dto.isDefault) {
      await this.addressRepository.update(
        { uid: requestUid, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(address, dto);
    const saved = await this.addressRepository.save(address);

    if (saved.isDefault) {
      await this.userRepository.update(requestUid, {
        defaultAddressId: saved.addressId,
      });
    }

    return saved;
  }

  async deleteAddress(requestUid: string, addressId: string) {
    const address = await this.addressRepository.findOne({
      where: { addressId },
    });
    if (!address) throw new NotFoundException('Địa chỉ không tồn tại.');
    if (address.uid !== requestUid) {
      throw new ForbiddenException('Bạn không có quyền xóa địa chỉ này.');
    }

    // Nếu xóa địa chỉ mặc định, xóa luôn default_address_id ở bảng users
    if (address.isDefault) {
      await this.userRepository.update(requestUid, {
        defaultAddressId: null as unknown as string,
      });
    }

    await this.addressRepository.remove(address);
    return { message: 'Đã xóa địa chỉ thành công.' };
  }
}
