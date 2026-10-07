export declare class User {
    id: string;
    username: string;
    passwordHash: string;
    email: string;
    fullName: string;
    phoneNumber?: string;
    status: string;
    lastLoginAt?: Date;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
    departmentId?: number;
    facilityId?: number;
    refreshToken?: string;
}
