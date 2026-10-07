import { Repository } from 'typeorm';
import { User } from './users/entities/user.entity';
export declare class AppController {
    private readonly userRepository;
    constructor(userRepository: Repository<User>);
    getHello(): Promise<{
        status: string;
        message: string;
        database: {
            connected: boolean;
            totalUsersInDb: number;
        };
        endpoints: {
            login: string;
            register: string;
        };
        timestamp: string;
        error?: undefined;
    } | {
        status: string;
        message: string;
        error: any;
        timestamp: string;
        database?: undefined;
        endpoints?: undefined;
    }>;
}
