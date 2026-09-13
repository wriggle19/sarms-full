import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBuildingDto, CreateCampusDto, CreateFloorDto, CreateRoomDto, UpdateBuildingDto, UpdateCampusDto, UpdateFloorDto, UpdateRoomDto } from './dto/location.dto';

/**
 * Covers the full physical hierarchy: Campus -> Building -> Floor -> Room.
 * Kept as one module/service because these four are always browsed and
 * administered together (Section 11 of the spec) - splitting them into four
 * modules would just mean four near-identical files.
 */
@Injectable()
export class LocationsService {
  constructor(private prisma: PrismaService) {}

  // --- Campuses ---
  createCampus(dto: CreateCampusDto) {
    return this.prisma.campus.create({ data: dto });
  }
  findCampuses() {
    return this.prisma.campus.findMany({ include: { buildings: true } });
  }
  async updateCampus(id: number, dto: UpdateCampusDto) {
    await this.findCampus(id);
    return this.prisma.campus.update({ where: { id }, data: dto });
  }
  async deleteCampus(id: number) {
    await this.findCampus(id);
    return this.prisma.campus.delete({ where: { id } });
  }
  private async findCampus(id: number) {
    const campus = await this.prisma.campus.findUnique({ where: { id } });
    if (!campus) throw new NotFoundException(`Campus ${id} not found`);
    return campus;
  }

  // --- Buildings ---
  createBuilding(dto: CreateBuildingDto) {
    return this.prisma.building.create({ data: dto });
  }
  findBuildings(campusId?: number) {
    return this.prisma.building.findMany({
      where: { campusId },
      include: { floors: true },
    });
  }
  async updateBuilding(id: number, dto: UpdateBuildingDto) {
    await this.findBuilding(id);
    return this.prisma.building.update({ where: { id }, data: dto });
  }
  async deleteBuilding(id: number) {
    await this.findBuilding(id);
    return this.prisma.building.delete({ where: { id } });
  }
  private async findBuilding(id: number) {
    const building = await this.prisma.building.findUnique({ where: { id } });
    if (!building) throw new NotFoundException(`Building ${id} not found`);
    return building;
  }

  // --- Floors ---
  createFloor(dto: CreateFloorDto) {
    return this.prisma.floor.create({ data: dto });
  }
  findFloors(buildingId?: number) {
    return this.prisma.floor.findMany({ where: { buildingId }, include: { rooms: true } });
  }
  async updateFloor(id: number, dto: UpdateFloorDto) {
    await this.findFloor(id);
    return this.prisma.floor.update({ where: { id }, data: dto });
  }
  async deleteFloor(id: number) {
    await this.findFloor(id);
    return this.prisma.floor.delete({ where: { id } });
  }
  private async findFloor(id: number) {
    const floor = await this.prisma.floor.findUnique({ where: { id } });
    if (!floor) throw new NotFoundException(`Floor ${id} not found`);
    return floor;
  }

  // --- Rooms ---
  createRoom(dto: CreateRoomDto) {
    return this.prisma.room.create({ data: dto });
  }

  findRooms(floorId?: number, departmentId?: number) {
    return this.prisma.room.findMany({
      where: { floorId, departmentId },
      include: { floor: { include: { building: { include: { campus: true } } } } },
    });
  }

  async updateRoom(id: number, dto: UpdateRoomDto) {
    await this.findRoom(id);
    return this.prisma.room.update({ where: { id }, data: dto });
  }
  async deleteRoom(id: number) {
    await this.findRoom(id);
    return this.prisma.room.delete({ where: { id } });
  }

  async findRoom(id: number) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: { floor: { include: { building: { include: { campus: true } } } } },
    });
    if (!room) throw new NotFoundException(`Room ${id} not found`);
    return room;
  }

  /** Every asset currently physically located in this room - powers the "room inventory" screen (Section 51). */
  async roomInventory(id: number) {
    await this.findRoom(id);
    return this.prisma.asset.findMany({
      where: { currentRoomId: id, isDeleted: false },
      include: { category: true, status: true, condition: true },
    });
  }
}
