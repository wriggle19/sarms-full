import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssetsService } from '../assets/assets.service';
import { NumberSequenceService } from '../common/utils/number-sequence.service';
import { CreatePurchaseOrderDto } from './dto/create-po.dto';
import { ReceivePoItemDto } from './dto/receive-po.dto';

/**
 * Purchasing (Section 30). The interesting part is receive(): turning one PO
 * line ("25x Dell Latitude Laptop") into 25 individually tagged, individually
 * QR-coded Asset rows - each gets its own serial/condition/history from the
 * moment it exists, rather than a batch "25 laptops" record nobody can track
 * individually.
 */
@Injectable()
export class ProcurementService {
  constructor(
    private prisma: PrismaService,
    private assetsService: AssetsService,
    private numberSequence: NumberSequenceService,
  ) {}

  async create(dto: CreatePurchaseOrderDto, orderedById: number) {
    const poNumber = await this.numberSequence.next('PO');
    const totalAmount = dto.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);

    return this.prisma.purchaseOrder.create({
      data: {
        poNumber,
        vendorId: dto.vendorId,
        departmentId: dto.departmentId,
        currency: dto.currency ?? 'GHS',
        totalAmount,
        orderedById,
        expectedDeliveryDate: dto.expectedDeliveryDate,
        items: {
          create: dto.items.map((i) => ({
            description: i.description,
            categoryId: i.categoryId,
            quantity: i.quantity,
            unitCost: i.unitCost,
            currency: i.currency ?? dto.currency ?? 'GHS',
          })),
        },
      },
      include: { items: true, vendor: true },
    });
  }

  findAll() {
    return this.prisma.purchaseOrder.findMany({
      include: { vendor: true, department: true, items: true },
      orderBy: { orderDate: 'desc' },
    });
  }

  async findOne(id: number) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: { vendor: true, department: true, items: true, assets: true },
    });
    if (!po) throw new NotFoundException(`Purchase order ${id} not found`);
    return po;
  }

  /**
   * Registers one Asset per unit for a PO line item, without requiring the
   * caller to supply a serial number per unit up front (schools frequently
   * receive equipment before serials are logged individually) - registers
   * generically and lets the officer fill in serials via the normal asset
   * edit flow afterward.
   */
  async receiveItem(poId: number, dto: ReceivePoItemDto, actorId: number) {
    const po = await this.findOne(poId);
    const item = po.items.find((i: any) => i.id === dto.poItemId);
    if (!item) throw new BadRequestException(`PO item ${dto.poItemId} does not belong to PO ${poId}`);
    if (!item.categoryId) {
      throw new BadRequestException('This PO item has no asset category set and cannot be received as assets yet');
    }

    const createdAssets: any[] = [];
    for (let i = 0; i < item.quantity; i++) {
      const asset = await this.assetsService.register(
        {
          name: item.description,
          categoryId: item.categoryId,
          owningDepartmentId: dto.owningDepartmentId,
          responsibleDepartmentId: dto.owningDepartmentId,
          vendorId: po.vendorId,
          purchaseOrderId: po.id,
          originalCost: Number(item.unitCost),
          currency: item.currency,
        } as any,
        actorId,
      );
      createdAssets.push(asset);
    }

    await this.prisma.purchaseOrder.update({ where: { id: poId }, data: { status: 'RECEIVED' } });

    return createdAssets;
  }
}
