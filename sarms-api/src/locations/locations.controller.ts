import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../common/guards/permission.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { LocationsService } from './locations.service';
import { CreateBuildingDto, CreateCampusDto, CreateFloorDto, CreateRoomDto, UpdateBuildingDto, UpdateCampusDto, UpdateFloorDto, UpdateRoomDto } from './dto/location.dto';

@ApiTags('locations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller()
export class LocationsController {
  constructor(private service: LocationsService) {}

  @Post('campuses')
  @RequirePermission('locations.manage')
  createCampus(@Body() dto: CreateCampusDto) {
    return this.service.createCampus(dto);
  }
  @Get('campuses')
  findCampuses() {
    return this.service.findCampuses();
  }
  @Patch('campuses/:id')
  @RequirePermission('locations.manage')
  updateCampus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCampusDto) {
    return this.service.updateCampus(id, dto);
  }
  @Delete('campuses/:id')
  @RequirePermission('locations.manage')
  deleteCampus(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteCampus(id);
  }

  @Post('buildings')
  @RequirePermission('locations.manage')
  createBuilding(@Body() dto: CreateBuildingDto) {
    return this.service.createBuilding(dto);
  }
  @Get('buildings')
  findBuildings(@Query('campusId') campusId?: string) {
    return this.service.findBuildings(campusId ? Number(campusId) : undefined);
  }
  @Patch('buildings/:id')
  @RequirePermission('locations.manage')
  updateBuilding(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateBuildingDto) {
    return this.service.updateBuilding(id, dto);
  }
  @Delete('buildings/:id')
  @RequirePermission('locations.manage')
  deleteBuilding(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteBuilding(id);
  }

  @Post('floors')
  @RequirePermission('locations.manage')
  createFloor(@Body() dto: CreateFloorDto) {
    return this.service.createFloor(dto);
  }
  @Get('floors')
  findFloors(@Query('buildingId') buildingId?: string) {
    return this.service.findFloors(buildingId ? Number(buildingId) : undefined);
  }
  @Patch('floors/:id')
  @RequirePermission('locations.manage')
  updateFloor(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateFloorDto) {
    return this.service.updateFloor(id, dto);
  }
  @Delete('floors/:id')
  @RequirePermission('locations.manage')
  deleteFloor(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteFloor(id);
  }

  @Post('rooms')
  @RequirePermission('locations.manage')
  createRoom(@Body() dto: CreateRoomDto) {
    return this.service.createRoom(dto);
  }
  @Get('rooms')
  findRooms(@Query('floorId') floorId?: string, @Query('departmentId') departmentId?: string) {
    return this.service.findRooms(
      floorId ? Number(floorId) : undefined,
      departmentId ? Number(departmentId) : undefined,
    );
  }
  @Patch('rooms/:id')
  @RequirePermission('locations.manage')
  updateRoom(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoomDto) {
    return this.service.updateRoom(id, dto);
  }
  @Delete('rooms/:id')
  @RequirePermission('locations.manage')
  deleteRoom(@Param('id', ParseIntPipe) id: number) {
    return this.service.deleteRoom(id);
  }
  @Get('rooms/:id')
  findRoom(@Param('id', ParseIntPipe) id: number) {
    return this.service.findRoom(id);
  }
  @Get('rooms/:id/inventory')
  roomInventory(@Param('id', ParseIntPipe) id: number) {
    return this.service.roomInventory(id);
  }
}
