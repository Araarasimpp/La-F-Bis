import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import {
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonMenuToggle
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';

import {
  homeOutline,
  cashOutline,
  cubeOutline,
  peopleOutline,
  receiptOutline,
  settingsOutline,
  bicycleOutline,
  logOutOutline,
  pricetagOutline
} from 'ionicons/icons';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonMenuToggle
  ],
  templateUrl: './app-menu.component.html',
  styleUrls: ['./app-menu.component.scss']
})
export class AppMenuComponent {

  constructor(
    private router: Router,
    public auth: AuthService
  ) {

    addIcons({
      homeOutline,
      cashOutline,
      cubeOutline,
      peopleOutline,
      receiptOutline,
      bicycleOutline,
      settingsOutline,
      logOutOutline,
      pricetagOutline
    });

  }

  go(url: string) {
    this.router.navigateByUrl(url);
  }

  async logout() {
    await this.auth.logout();
    this.router.navigateByUrl('/');
  }

}