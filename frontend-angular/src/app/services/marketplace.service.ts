import { Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Seller, Product, Order, DeliveryAgent, UserRole } from '../models/marketplace.model';

@Injectable({
  providedIn: 'root'
})
export class MarketplaceService {
  private readonly apiUrl = 'http://localhost:8080/api/v1';

  // Angular Signals for reactive state management
  currentRole = signal<UserRole>('buyer');
  activeCartCount = signal<number>(0);
  selectedLocality = signal<string>('All Localities (Kurali City)');

  constructor(private http: HttpClient) {}

  setRole(role: UserRole): void {
    this.currentRole.set(role);
  }

  // --- SELLER MICROSERVICE API ---
  registerSeller(seller: Partial<Seller>): Observable<Seller> {
    return this.http.post<Seller>(`${this.apiUrl}/sellers/register`, seller);
  }

  getSeller(sellerId: string): Observable<Seller> {
    return this.http.get<Seller>(`${this.apiUrl}/sellers/${sellerId}`);
  }

  addProduct(sellerId: string, product: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/sellers/${sellerId}/products`, product);
  }

  getSellerProducts(sellerId: string): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/sellers/${sellerId}/products`);
  }

  // --- BUYER MICROSERVICE API ---
  searchProducts(query: string = ''): Observable<Product[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<Product[]>(`${this.apiUrl}/buyers/products/search`, { params });
  }

  placeOrder(order: Partial<Order>): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/buyers/orders`, order);
  }

  trackOrder(orderId: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/buyers/orders/${orderId}/track`);
  }

  // --- DELIVERY FLEET MICROSERVICE API ---
  registerDeliveryAgent(agent: Partial<DeliveryAgent>): Observable<DeliveryAgent> {
    return this.http.post<DeliveryAgent>(`${this.apiUrl}/delivery/register`, agent);
  }

  getAvailableJobs(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.apiUrl}/delivery/jobs/available`);
  }

  claimJob(orderId: string, agentId: string): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/delivery/jobs/${orderId}/claim?agentId=${agentId}`, {});
  }

  verifyDeliveryOtp(orderId: string, otp: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/delivery/jobs/${orderId}/verify-otp`, { otp });
  }

  // --- ADMIN OPERATIONS & ANALYTICS MICROSERVICE API ---
  getPendingSellers(): Observable<Seller[]> {
    return this.http.get<Seller[]>(`${this.apiUrl}/admin/sellers/pending`);
  }

  approveSeller(sellerId: string): Observable<Seller> {
    return this.http.post<Seller>(`${this.apiUrl}/admin/sellers/${sellerId}/approve`, {});
  }

  rejectSeller(sellerId: string): Observable<Seller> {
    return this.http.post<Seller>(`${this.apiUrl}/admin/sellers/${sellerId}/reject`, {});
  }

  getDemandAnalytics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/admin/analytics/demand-trends`);
  }
}
