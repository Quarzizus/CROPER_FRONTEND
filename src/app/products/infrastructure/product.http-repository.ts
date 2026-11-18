import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL } from '../../core/http/api-base-url.token';
import type { Page, PageRequest } from '../domain/page';
import type { Product } from '../domain/product';
import type { ProductDraft } from '../domain/product-draft';
import { ProductRepository } from '../domain/product.repository';
import type { PaginatedProductsDto, ProductDto } from './product.dto';
import { toListQuery, toPage, toProduct, toWriteRequest } from './product.mapper';

/** Adaptador HTTP del puerto `ProductRepository`. */
@Injectable()
export class HttpProductRepository implements ProductRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly collectionUrl = `${this.baseUrl}/products`;

  async list(request: PageRequest): Promise<Page<Product>> {
    const query = toListQuery(request);
    const params = new HttpParams()
      .set('page', query.page)
      .set('limit', query.limit);

    const dto = await firstValueFrom(
      this.http.get<PaginatedProductsDto>(this.collectionUrl, { params }),
    );

    return toPage(dto);
  }

  async getById(id: string): Promise<Product> {
    const dto = await firstValueFrom(this.http.get<ProductDto>(`${this.collectionUrl}/${id}`));
    return toProduct(dto);
  }

  async create(draft: ProductDraft): Promise<Product> {
    const dto = await firstValueFrom(
      this.http.post<ProductDto>(this.collectionUrl, toWriteRequest(draft)),
    );
    return toProduct(dto);
  }

  async update(id: string, draft: ProductDraft): Promise<Product> {
    const dto = await firstValueFrom(
      this.http.patch<ProductDto>(`${this.collectionUrl}/${id}`, toWriteRequest(draft)),
    );
    return toProduct(dto);
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.delete<void>(`${this.collectionUrl}/${id}`));
  }
}
