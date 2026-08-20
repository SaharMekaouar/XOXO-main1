import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AcceuilUserPage } from './acceuil-user.page';

describe('AcceuilUserPage', () => {
  let component: AcceuilUserPage;
  let fixture: ComponentFixture<AcceuilUserPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AcceuilUserPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
