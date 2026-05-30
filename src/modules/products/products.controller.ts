import { Controller, Get, Param, Query } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiTags('Hàng hóa & Cửa hàng (Products & Stores)')
@Controller()
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get('categories')
  @ApiOperation({
    summary: 'Lấy danh sách tất cả các danh mục sản phẩm hoạt động',
  })
  getCategories() {
    return this.productsService.getCategories();
  }

  @Get('brands')
  @ApiOperation({ summary: 'Lấy danh sách tất cả các thương hiệu hoạt động' })
  getBrands() {
    return this.productsService.getBrands();
  }

  @Get('stores')
  @ApiOperation({
    summary: 'Lấy danh sách tất cả các chi nhánh cửa hàng kèm tọa độ',
  })
  getStores() {
    return this.productsService.getStores();
  }

  @Get('products')
  @ApiOperation({
    summary: 'Lấy danh sách sản phẩm kết hợp lọc, tìm kiếm và phân trang',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Số trang hiện tại (mặc định: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số sản phẩm mỗi trang (mặc định: 10)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Từ khóa tìm kiếm theo tên sản phẩm',
  })
  @ApiQuery({
    name: 'categoryId',
    required: false,
    type: String,
    description: 'Lọc theo ID danh mục',
  })
  @ApiQuery({
    name: 'brandId',
    required: false,
    type: String,
    description: 'Lọc theo ID thương hiệu',
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Lọc giá bán tối thiểu',
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Lọc giá bán tối đa',
  })
  @ApiQuery({
    name: 'gender',
    required: false,
    enum: ['men', 'women', 'unisex'],
    description: 'Lọc theo đối tượng giới tính',
  })
  getProducts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brandId') brandId?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('gender') gender?: 'men' | 'women' | 'unisex',
  ) {
    return this.productsService.getProducts({
      page,
      limit,
      search,
      categoryId,
      brandId,
      minPrice,
      maxPrice,
      gender,
    });
  }

  @Get('products/:id')
  @ApiOperation({
    summary: 'Xem chi tiết một sản phẩm kèm các biến thể SKU còn hàng',
  })
  getProductDetail(@Param('id') id: string) {
    return this.productsService.getProductDetail(id);
  }
}
