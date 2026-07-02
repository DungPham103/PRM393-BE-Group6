import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import {
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('Hàng hóa & Cửa hàng (Products & Stores)')
@Controller()
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Lấy danh sách danh mục sản phẩm' })
  getCategories() {
    return this.productsService.getCategories();
  }

  @Get('brands')
  @ApiOperation({ summary: 'Lấy danh sách thương hiệu' })
  getBrands() {
    return this.productsService.getBrands();
  }

  @Post('brands')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Thêm thương hiệu mới (Admin)' })
  createBrand(@Body('name') name: string) {
    return this.productsService.createBrand(name);
  }

  @Get('stores')
  @ApiOperation({ summary: 'Lấy danh sách chi nhánh cửa hàng kèm tọa độ' })
  getStores() {
    return this.productsService.getStores();
  }

  @Get('products')
  @ApiOperation({
    summary: 'Danh sách sản phẩm (filter + search + phân trang)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Trang (mặc định 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng mỗi trang (mặc định 20)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Tìm theo tên sản phẩm',
  })
  @ApiQuery({
    name: 'category_id',
    required: false,
    type: String,
    description: 'Lọc theo danh mục',
  })
  @ApiQuery({
    name: 'brand_id',
    required: false,
    type: String,
    description: 'Lọc theo thương hiệu',
  })
  @ApiQuery({
    name: 'min_price',
    required: false,
    type: Number,
    description: 'Giá tối thiểu',
  })
  @ApiQuery({
    name: 'max_price',
    required: false,
    type: Number,
    description: 'Giá tối đa',
  })
  @ApiQuery({
    name: 'on_sale',
    required: false,
    type: Boolean,
    description: 'Chỉ lấy sản phẩm khuyến mãi',
  })
  @ApiQuery({
    name: 'in_stock',
    required: false,
    type: Boolean,
    description: 'Chỉ lấy sản phẩm còn hàng',
  })
  @ApiQuery({
    name: 'size',
    required: false,
    type: String,
    description: 'Lọc theo size',
  })
  @ApiQuery({
    name: 'gender',
    required: false,
    enum: ['men', 'women', 'unisex'],
    description: 'Lọc theo giới tính',
  })
  getProducts(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('category_id') categoryId?: string,
    @Query('brand_id') brandId?: string,
    @Query('size') size?: string,
    @Query('min_price') minPrice?: number,
    @Query('max_price') maxPrice?: number,
    @Query('on_sale') onSale?: boolean,
    @Query('in_stock') inStock?: boolean,
    @Query('gender') gender?: 'men' | 'women' | 'unisex',
  ) {
    return this.productsService.getProducts({
      page,
      limit,
      search,
      categoryId,
      brandId,
      size,
      minPrice,
      maxPrice,
      onSale,
      inStock,
      gender,
    });
  }

  @Get('products/image-proxy')
  @ApiOperation({ summary: 'Proxy ảnh tránh lỗi CORS trên Web' })
  proxyImage(@Query('url') url: string, @Res() res: Response) {
    if (!url) {
      return res.status(400).send('Missing url parameter');
    }
    const protocol = url.startsWith('https') ? require('https') : require('http');
    protocol.get(url, (response) => {
      const contentType = response.headers['content-type'] || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Access-Control-Allow-Origin', '*');
      response.pipe(res);
    }).on('error', (e) => {
      res.status(500).send(`Error: ${e.message}`);
    });
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Chi tiết sản phẩm + variants' })
  getProductDetail(@Param('id') id: string) {
    return this.productsService.getProductDetail(id);
  }

  @Post('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Tạo sản phẩm mới (Admin)' })
  createProduct(@Body() dto: CreateProductDto) {
    return this.productsService.createProduct(dto);
  }

  @Patch('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cập nhật sản phẩm (Admin)' })
  updateProduct(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.updateProduct(id, dto);
  }

  @Delete('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Xóa sản phẩm (Admin)' })
  deleteProduct(@Param('id') id: string) {
    return this.productsService.deleteProduct(id);
  }

  @Get('products/uploads/:filename')
  @ApiOperation({ summary: 'Lấy file ảnh upload' })
  serveImage(@Param('filename') filename: string, @Res() res: Response) {
    res.sendFile(filename, { root: './public/uploads' });
  }

  @Post('products/upload')
  @ApiOperation({ summary: 'Upload ảnh sản phẩm' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './public/uploads',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return { url: `/api/v1/products/uploads/${file.filename}` };
  }
}
