import { Routes } from '@angular/router';

export const CUSTOMER_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'home' },
  { path: 'home', loadComponent: () => import('./home/home.component').then((m) => m.HomeComponent) },
  { path: 'search', loadComponent: () => import('./search/search.component').then((m) => m.SearchComponent) },
  {
    path: 'restaurants',
    loadComponent: () => import('./restaurants/restaurant-list.component').then((m) => m.RestaurantListComponent),
  },
  {
    path: 'restaurants/:id',
    loadComponent: () => import('./restaurants/restaurant-detail.component').then((m) => m.RestaurantDetailComponent),
  },
  {
    path: 'restaurants/:id/items/:itemId',
    loadComponent: () => import('./food-detail/food-detail.component').then((m) => m.FoodDetailComponent),
  },
  { path: 'cart', loadComponent: () => import('./cart/cart.component').then((m) => m.CartComponent) },
  { path: 'checkout', loadComponent: () => import('./checkout/checkout.component').then((m) => m.CheckoutComponent) },
  { path: 'addresses', loadComponent: () => import('./addresses/addresses.component').then((m) => m.AddressesComponent) },
  {
    path: 'orders',
    loadComponent: () => import('./orders/order-history.component').then((m) => m.OrderHistoryComponent),
  },
  {
    path: 'orders/current',
    loadComponent: () => import('./orders/current-order.component').then((m) => m.CurrentOrderComponent),
  },
  {
    path: 'orders/:id',
    loadComponent: () => import('./orders/order-details.component').then((m) => m.OrderDetailsComponent),
  },
  {
    path: 'orders/:id/review',
    loadComponent: () => import('./reviews/review-form.component').then((m) => m.ReviewFormComponent),
  },
  { path: 'profile', loadComponent: () => import('./profile/profile.component').then((m) => m.ProfileComponent) },
  {
    path: 'notifications',
    loadComponent: () => import('./notifications/notifications.component').then((m) => m.NotificationsComponent),
  },
];
