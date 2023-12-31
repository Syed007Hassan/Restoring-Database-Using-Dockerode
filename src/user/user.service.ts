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
    // Define the path to the dump file inside the container
    const dumpFilePath = '/dbDumpFile/postgres.tar';

    try {
      // Create a new Docker object
      const docker = new Docker({ socketPath: '/var/run/docker.sock' });

      // Get the 'postgres-db' container
      const container = docker.getContainer('postgres-db');

      // Define the command to restore the database dump
      const command = [
        'bash',
        '-c',
        `PGPASSWORD=${process.env.PG_PASSWORD} pg_restore --verbose --clean --no-acl --no-owner -h${process.env.PG_HOST} -U${process.env.PG_USER} -d${process.env.PG_DB} ${dumpFilePath}`,
      ];

      // Define the options for the exec command
      const options = {
        Cmd: command,
        AttachStdout: true,
        AttachStderr: true,
      };

      // Create an exec instance with the command and options
      const exec = await container.exec(options);

      // Start the exec instance and attach a stream to its stdout and stderr
      const result = await new Promise((resolve, reject) => {
        exec.start({ hijack: true, stdin: true }, (err, stream) => {
          if (err) {
            reject(err);
          }

          // Demultiplex the stream into stdout and stderr
          container.modem.demuxStream(stream, process.stdout, process.stderr);

          // Resolve the promise when the stream ends
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

  async runContainer() {
    try {
      // Create a new Docker object
      const docker = new Docker({ socketPath: '/var/run/docker.sock' });

      // Pull the 'hello-world:latest' image from Docker Hub
      await new Promise((resolve, reject) => {
        docker.pull('hello-world:latest', (err, stream) => {
          if (err) {
            return reject(err);
          }
          // Follow the download progress of the image
          docker.modem.followProgress(stream, (err, res) =>
            err ? reject(err) : resolve(res),
          );
        });
      });

      // Create a new container with the 'hello-world' image
      const container = await docker.createContainer({
        AttachStderr: true,
        AttachStdin: true,
        AttachStdout: true,
        Image: 'hello-world',
        OpenStdin: true,
        StdinOnce: true,
        Tty: false,
      });

      // Attach a stream to the container's stdin and stdout
      const stream = await container.attach({
        hijack: true,
        stderr: true,
        stdin: true,
        stdout: true,
        stream: true,
      });

      // Create a promise that resolves to the container's stdout
      const stdout = new Promise((resolve) => {
        stream.on('data', (data) => {
          const response = data && data.slice(8).toString();
          resolve(response);
        });
      });

      // Start the container
      await container.start();
      // End the stream
      stream.end();
      // Wait for the container to finish
      await container.wait();
      // Remove the container
      container.remove();

      // Return the container's stdout
      return await stdout;
    } catch (error) {
      console.error(`Error is: ${error}`);
      return Promise.reject(error);
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
