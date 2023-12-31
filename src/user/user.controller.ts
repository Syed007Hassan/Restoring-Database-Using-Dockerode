import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('user')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('loadDataBaseDump')
  @ApiOperation({
    description: 'Load/Import the database dump',
  })
  async loadDataBaseDump() {
    try {
      const data = await this.userService.loadDataBaseDump();
      return { success: true, data: data };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  @Get('listAllContainers')
  @ApiOperation({
    description: 'List all containers',
  })
  async listAllContainers() {
    try {
      const containers = await this.userService.listAllContainers();
      return { success: true, data: containers };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  @Post('runContainer')
  @ApiOperation({
    description: 'Run a hello-world image in a container',
  })
  async runContainer() {
    try {
      const output = await this.userService.runContainer();
      return { success: true, data: output };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  @Get('findAll')
  async findAll() {
    try {
      const users = await this.userService.findAll();
      return { success: true, data: users };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  @Get('findOne/:id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(+id);
  }

  @Get('findOneByEmail/:email')
  async findOneByEmail(@Param('email') email: string) {
    try {
      const user = await this.userService.findOneByEmail(email);
      return { success: true, data: user };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }

  @Patch('update/:id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(+id, updateUserDto);
  }

  @Delete('delete/:id')
  remove(@Param('id') id: string) {
    return this.userService.remove(+id);
  }
}
