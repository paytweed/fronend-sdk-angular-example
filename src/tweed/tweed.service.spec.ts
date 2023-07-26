import { TestBed } from '@angular/core/testing';

import { TweedService } from './tweed.service';

describe('TweedService', () => {
  let service: TweedService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TweedService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
