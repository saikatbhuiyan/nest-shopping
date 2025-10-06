import { Test, TestingModule } from '@nestjs/testing';
import { AwsSnsService } from './aws-sns.service';

describe('AwsSnsService', () => {
  let service: AwsSnsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AwsSnsService],
    }).compile();

    service = module.get<AwsSnsService>(AwsSnsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
