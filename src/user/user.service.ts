import { Inject, Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { InjectRepository } from '@nestjs/typeorm';

import * as Docker from 'dockerode';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async loadDataBaseDump() {
    // Define the path to the dump file
    const dumpFilePath = '/dbDumpFile/postgres.tar';

    try {
      const docker = new Docker({ socketPath: '/var/run/docker.sock' });

      const container = docker.getContainer('postgres-db');
      const command = [
        'bash',
        '-c',
        `PGPASSWORD=${process.env.PG_PASSWORD} pg_restore --verbose --clean --no-acl --no-owner -h${process.env.PG_HOST} -U${process.env.PG_USER} -d${process.env.PG_DB} ${dumpFilePath}`,
      ];

      const options = {
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
      };

      const exec = await container.exec(options);
      const result = await new Promise((resolve, reject) => {
        exec.start({ hijack: true, stdin: true }, (err, stream) => {
          if (err) {
            reject(err);
          }

          container.modem.demuxStream(stream, process.stdout, process.stderr);

          stream.on('end', () => resolve('Command execution completed'));
        });
      });

      console.log('End of command execution');
      return result;
    } catch (error) {
      console.error(`Error is: ${error}`);
      throw error;
    }
  }

  async listAllContainers() {
    try {
      const docker = new Docker({ socketPath: '/var/run/docker.sock' });
      const containers = await docker.listContainers({ all: true });
      return containers;
    } catch (error) {
      console.error(`Error is: ${error}`);
      throw error;
    }
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const saltRounds = 10;
    const hash = bcrypt.hashSync(createUserDto.password, saltRounds);
    const newUser = await this.userRepo.create({
      ...createUserDto,
      password: hash,
    });

    await this.userRepo.save(newUser);

    return newUser;
  }

  async findAll() {
    const users = await this.userRepo.find();
    if (!users) {
      throw new Error('No users found');
    }
    return users;
  }

  async findOneByEmail(email: string) {
    const user = await this.userRepo.findOneBy({ email });
    return user;
  }

  findOne(id: number) {
    const user = this.userRepo.findOneBy({ id });
    return user;
  }

  update(id: number, updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }
}
