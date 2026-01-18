import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductDocument } from './product.entity';
import { ProductQueryDto } from './dto/product-query.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async create(createProductDto: CreateProductDto): Promise<Product> {
    const createdProduct = new this.productModel(createProductDto);
    return createdProduct.save();
  }

  async findAll(query: ProductQueryDto): Promise<any> {
    const { search, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', categoryId } = query;

    const filter: FilterQuery<ProductDocument> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
      ];
    }

    if (categoryId && Types.ObjectId.isValid(categoryId)) {
      filter.category = new Types.ObjectId(categoryId);
    }

    const skip = (page - 1) * limit;
    const sortCriteria = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const products = await this.productModel
      .find(filter)
      .sort(sortCriteria)
      .skip(skip)
      .limit(limit)
      .populate('category', 'name') // Populate category name only
      .exec();

    const total = await this.productModel.countDocuments(filter).exec();

    return { products, total, page, limit };
  }

  async findOne(id: Types.ObjectId): Promise<Product> {
    const product = await this.productModel.findById(id).populate('category', 'name').exec();
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return product;
  }

  async update(id: Types.ObjectId, updateProductDto: UpdateProductDto): Promise<Product> {
    const existingProduct = await this.productModel
      .findByIdAndUpdate(id, { $set: updateProductDto }, { new: true })
      .populate('category', 'name')
      .exec();
    if (!existingProduct) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return existingProduct;
  }

  async remove(id: Types.ObjectId): Promise<any> {
    const result = await this.productModel.deleteOne({ _id: id }).exec();
    if (result.deletedCount === 0) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return { message: 'Product deleted successfully' };
  }
}
