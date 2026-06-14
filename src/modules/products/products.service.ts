import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { Brand } from '../../entities/brand.entity';
import { StoreLocation } from '../../entities/store-location.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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

  async getCategories() {
    return this.categoryRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  async getBrands() {
    return this.brandRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
  }

  async getStores() {
    return this.storeRepository.find({
      where: { isActive: true },
    });
  }

  async createBrand(name: string) {
    const brand = this.brandRepository.create({ name, isActive: true });
    return this.brandRepository.save(brand);
  }

  async getProducts(query: {
    page?: number;
    limit?: number;
    search?: string;
    categoryId?: string;
    brandId?: string;
    size?: string;
    minPrice?: number;
    maxPrice?: number;
    onSale?: boolean;
    inStock?: boolean;
    gender?: 'men' | 'women' | 'unisex';
  }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .where('product.isActive = :isActive', { isActive: true });

    if (query.search) {
      queryBuilder.andWhere('product.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    if (query.categoryId) {
      queryBuilder.andWhere('product.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }

    if (query.size) {
      queryBuilder.innerJoin(
        'product.variants',
        'variant',
        'variant.size = :size',
        { size: query.size },
      );
    }

    if (query.brandId) {
      queryBuilder.andWhere('product.brandId = :brandId', {
        brandId: query.brandId,
      });
    }

    if (query.gender) {
      queryBuilder.andWhere('product.gender = :gender', {
        gender: query.gender,
      });
    }

    if (query.onSale) {
      queryBuilder.andWhere('product.salePrice IS NOT NULL');
    }

    if (query.inStock) {
      queryBuilder.andWhere('product.totalStock > 0');
    }

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

    return { ...product, variants };
  }

  // === Admin CRUD ===

  async createProduct(dto: CreateProductDto) {
    // Kiểm tra categoryId tồn tại trong database
    const category = await this.categoryRepository.findOne({
      where: { categoryId: dto.categoryId },
    });
    if (!category) {
      throw new NotFoundException(
        `Danh mục với ID "${dto.categoryId}" không tồn tại.`,
      );
    }

    // Kiểm tra brandId tồn tại trong database
    const brand = await this.brandRepository.findOne({
      where: { brandId: dto.brandId },
    });
    if (!brand) {
      throw new NotFoundException(
        `Thương hiệu với ID "${dto.brandId}" không tồn tại.`,
      );
    }

    const product = this.productRepository.create({
      categoryId: dto.categoryId,
      brandId: dto.brandId,
      name: dto.name,
      description: dto.description,
      price: dto.price,
      salePrice: dto.salePrice,
      images: dto.images || [],
      material: dto.material,
      gender: dto.gender || 'unisex',
      origin: dto.origin,
      warrantyInfo: dto.warrantyInfo,
    });
    const savedProduct = await this.productRepository.save(product);

    if (dto.variants && dto.variants.length > 0) {
      const variantsToSave = dto.variants.map((v) => {
        return this.variantRepository.create({
          productId: savedProduct.productId,
          size: v.size,
          colorName: v.colorName,
          stockQty: v.stockQty,
          sku: `${savedProduct.productId.substring(0, 8)}-${v.size}-${v.colorName}`.toUpperCase(),
        });
      });
      await this.variantRepository.save(variantsToSave);
    }

    return savedProduct;
  }

  async updateProduct(productId: string, dto: UpdateProductDto) {
    const product = await this.productRepository.findOne({
      where: { productId },
    });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại.');

    // Nếu cập nhật categoryId, kiểm tra xem nó có tồn tại hay không
    if (dto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { categoryId: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(
          `Danh mục với ID "${dto.categoryId}" không tồn tại.`,
        );
      }
    }

    // Nếu cập nhật brandId, kiểm tra xem nó có tồn tại hay không
    if (dto.brandId) {
      const brand = await this.brandRepository.findOne({
        where: { brandId: dto.brandId },
      });
      if (!brand) {
        throw new NotFoundException(
          `Thương hiệu với ID "${dto.brandId}" không tồn tại.`,
        );
      }
    }

    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  async deleteProduct(productId: string) {
    const product = await this.productRepository.findOne({
      where: { productId },
    });
    if (!product) throw new NotFoundException('Sản phẩm không tồn tại.');
    product.isActive = false;
    await this.productRepository.save(product);
    return { message: 'Đã xóa sản phẩm thành công.' };
  }
}
