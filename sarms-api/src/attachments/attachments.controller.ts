import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { Audit } from '../common/decorators/audit.decorator';
import { AttachmentsService, ATTACHABLE_ENTITIES } from './attachments.service';

@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('attachments')
export class AttachmentsController {
  constructor(private service: AttachmentsService) {}

  @Get('entities')
  entities() {
    return ATTACHABLE_ENTITIES;
  }

  @Get()
  list(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.list(entityType, Number(entityId), user);
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @Audit({ action: 'CREATE', module: 'attachments', recordType: 'Attachment' })
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { entityType: string; entityId: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.save(file, body.entityType, Number(body.entityId), user.id);
  }

  @Get(':id')
  download(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getFile(id, user);
  }

  @Delete(':id')
  @Audit({ action: 'DELETE', module: 'attachments', recordType: 'Attachment' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user);
  }

  @Patch(':id')
  @Audit({ action: 'UPDATE', module: 'attachments', recordType: 'Attachment' })
  rename(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { fileName: string },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.rename(id, body.fileName, user);
  }
}
