import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingSpinnerComponent } from '../../../shared/ui/loading-spinner/loading-spinner.component';
import { CartStateService } from '../data/cart-state.service';
import { MenuService } from '../data/menu.service';
import type { FoodAddonGroup, MenuItem } from '../data/models';

@Component({
  selector: 'app-food-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingSpinnerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './food-detail.component.html',
})
export class FoodDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly menuService = inject(MenuService);
  private readonly cartState = inject(CartStateService);

  readonly loading = signal(true);
  readonly item = signal<MenuItem | null>(null);
  readonly addonGroups = signal<FoodAddonGroup[]>([]);
  readonly selectedVariationName = signal<string | undefined>(undefined);
  readonly selectedAddonNames = signal<string[]>([]);
  readonly qty = signal(1);
  readonly instructions = signal('');
  readonly adding = signal(false);

  private restaurantId = '';

  async ngOnInit(): Promise<void> {
    this.restaurantId = this.route.snapshot.paramMap.get('id')!;
    const itemId = this.route.snapshot.paramMap.get('itemId')!;
    this.loading.set(true);
    try {
      const [item, addons] = await Promise.all([
        this.menuService.getItem(this.restaurantId, itemId),
        this.menuService.listAddons(this.restaurantId),
      ]);
      this.item.set(item);
      this.addonGroups.set(addons.items.filter((g) => item.addonGroupIds.includes(g._id)));
      if (item.variations.length > 0) {
        this.selectedVariationName.set(item.variations[0].name);
      }
    } finally {
      this.loading.set(false);
    }
  }

  toggleAddon(name: string, group: FoodAddonGroup): void {
    const current = this.selectedAddonNames();
    if (current.includes(name)) {
      this.selectedAddonNames.set(current.filter((n) => n !== name));
      return;
    }
    const selectedInGroup = current.filter((n) => group.options.some((o) => o.name === n));
    if (selectedInGroup.length >= group.maxSelectable) {
      return;
    }
    this.selectedAddonNames.set([...current, name]);
  }

  changeQty(delta: number): void {
    this.qty.update((q) => Math.max(1, q + delta));
  }

  async addToCart(): Promise<void> {
    const item = this.item();
    if (!item) return;
    this.adding.set(true);
    try {
      await this.cartState.addItem({
        restaurantId: this.restaurantId,
        menuItemId: item._id,
        qty: this.qty(),
        selectedVariationName: this.selectedVariationName(),
        selectedAddonNames: this.selectedAddonNames(),
        instructions: this.instructions() || undefined,
      });
      await this.router.navigateByUrl('/customer/cart');
    } finally {
      this.adding.set(false);
    }
  }
}
