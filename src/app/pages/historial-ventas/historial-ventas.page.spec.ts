import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistorialVentasPage } from './historial-ventas.page';

describe('HistorialVentasPage', () => {
  let component: HistorialVentasPage;
  let fixture: ComponentFixture<HistorialVentasPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(HistorialVentasPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
