import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { Brand } from '../../entities/brand.entity';
import { StoreLocation } from '../../entities/store-location.entity';
import { ProductVariant } from '../../entities/product-variant.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Brand)
    private brandRepository: Repository<Brand>,
    @InjectRepository(StoreLocation)
    private storeRepository: Repository<StoreLocation>,
  ) {}

  // 1. Lấy tất cả danh mục
  async getCategories() {
    return this.categoryRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  // 2. Lấy tất cả thương hiệu
  async getBrands() {
    return this.brandRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  // 3. Lấy tất cả địa chỉ cửa hàng
  async getStores() {
    return this.storeRepository.find({
      where: { isActive: true },
    });
  }

  // 4. Lấy danh sách sản phẩm kèm lọc, tìm kiếm và phân trang
  async getProducts(query: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    brandId?: string;
    minPrice?: number;
    maxPrice?: number;
    gender?: 'men' | 'women' | 'unisex';
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .where('product.isActive = :isActive', { isActive: true });

    // Lọc theo từ khóa tìm kiếm (Tên sản phẩm)
    if (query.search) {
      queryBuilder.andWhere('product.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    // Lọc theo danh mục
    if (query.categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    // Lọc theo thương hiệu
    if (query.brandId) {
      queryBuilder.andWhere('product.brandId = :brandId', {
        brandId: query.brandId,
      });
    }

    // Lọc theo giới tính
    if (query.gender) {
      queryBuilder.andWhere('product.gender = :gender', {
        gender: query.gender,
      });
    }

    // Lọc theo khoảng giá (so sánh với salePrice nếu có, ngược lại so sánh với price)
    if (query.minPrice !== undefined) {
      queryBuilder.andWhere(
        'COALESCE(product.salePrice, product.price) >= :minPrice',
        { minPrice: query.minPrice },
      );
    }
    if (query.maxPrice !== undefined) {
      queryBuilder.andWhere(
        'COALESCE(product.salePrice, product.price) <= :maxPrice',
        { maxPrice: query.maxPrice },
      );
    }

    // Phân trang & Sắp xếp mới nhất trước
    queryBuilder.orderBy('product.createdAt', 'DESC').skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      meta: {
        totalItems: total,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }

  // 5. Lấy chi tiết sản phẩm và các biến thể còn hàng
  async getProductDetail(productId: string) {
    const product = await this.productRepository.findOne({
      where: { productId, isActive: true },
      relations: { category: true, brand: true },
    });

    if (!product) {
      throw new NotFoundException(
        'Không tìm thấy sản phẩm hoặc sản phẩm đã bị ẩn.',
      );
    }

    const variants = await this.variantRepository.find({
      where: { productId, isActive: true },
      order: { size: 'ASC', colorName: 'ASC' },
    });

    return {
      ...product,
      variants,
    };
  }
}
