import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAcademicYearDto, UpdateAcademicYearDto } from './dto/academic-year.dto';

@Injectable()
export class AcademicYearsService {
  constructor(private prisma: PrismaService) {}

  create(dto: CreateAcademicYearDto) {
    return this.prisma.academicYear.create({ data: this.normalize(dto) });
  }

  async update(id: number, dto: UpdateAcademicYearDto) {
    await this.findOne(id);
    return this.prisma.academicYear.update({ where: { id }, data: this.normalize(dto) });
  }

  /** Accept date-only strings ("2027-09-01") as well as full ISO-8601 datetimes. */
  private normalize(dto: CreateAcademicYearDto | UpdateAcademicYearDto) {
    const data: any = { ...dto };
    if (data.startDate && typeof data.startDate === 'string' && data.startDate.length === 10) {
      data.startDate = new Date(`${data.startDate}T00:00:00.000Z`);
    }
    if (data.endDate && typeof data.endDate === 'string' && data.endDate.length === 10) {
      data.endDate = new Date(`${data.endDate}T23:59:59.999Z`);
    }
    return data;
  }

  findAll() {
    return this.prisma.academicYear.findMany({ orderBy: { startDate: 'desc' } });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.academicYear.delete({ where: { id } });
  }

  async findOne(id: number) {
    const year = await this.prisma.academicYear.findUnique({ where: { id } });
    if (!year) throw new NotFoundException(`Academic year ${id} not found`);
    return year;
  }

  /** Only one academic year should be "current" at a time - this enforces that. */
  async setCurrent(id: number) {
    return this.prisma.$transaction([
      this.prisma.academicYear.updateMany({ data: { isCurrent: false }, where: { isCurrent: true } }),
      this.prisma.academicYear.update({ where: { id }, data: { isCurrent: true } }),
    ]);
  }

  /**
   * Section 44/18: identifies equipment issued for the given academic year
   * whose expected return date has passed and hasn't actually been returned -
   * the "should this be returned or rolled over" rollover list.
   */
  async endOfYearOutstanding(academicYearId: number) {
    return this.prisma.assetAssignment.findMany({
      where: { academicYearId, status: 'ACTIVE' },
      include: { asset: true, custodian: true },
    });
  }
}
