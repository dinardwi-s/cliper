import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { RenameProjectDto } from './dto/rename-project.dto';
import { ProjectService } from './project.service';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectController {
  constructor(private readonly projects: ProjectService) {}

  @Post()
  create(@Req() request: Request & { user: AuthenticatedUser }, @Body() dto: CreateProjectDto) {
    return this.projects.create(request.user.id, dto);
  }

  @Get()
  findAll(@Req() request: Request & { user: AuthenticatedUser }) {
    return this.projects.findAll(request.user.id);
  }

  @Get(':id')
  findOne(@Req() request: Request & { user: AuthenticatedUser }, @Param('id') id: string) {
    return this.projects.findOne(request.user.id, id);
  }

  @Patch(':id')
  rename(@Req() request: Request & { user: AuthenticatedUser }, @Param('id') id: string, @Body() dto: RenameProjectDto) {
    return this.projects.rename(request.user.id, id, dto.title);
  }

  @Delete(':id')
  async remove(@Req() request: Request & { user: AuthenticatedUser }, @Param('id') id: string) {
    await this.projects.remove(request.user.id, id);
    return { deleted: true };
  }
}
