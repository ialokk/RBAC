import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaInstallBannerComponent } from './shared/ui/pwa-install-banner/pwa-install-banner.component';
import { PwaUpdateBannerComponent } from './shared/ui/pwa-update-banner/pwa-update-banner.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PwaInstallBannerComponent, PwaUpdateBannerComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
